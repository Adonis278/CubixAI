import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { Response as OpenAIResponse, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { z } from "zod";
import { clamp, safeHostname } from "@/lib/utils";
import {
  AccuracyFinding,
  AccuracyMetrics,
  AnalysisOutput,
  AssistantCoverage,
  AssistantName,
  BriefCoverage,
  Citation,
  ClaimType,
  ExtractedClaim,
  NewAnalysisInput,
  QueryResult,
  QueryTheme,
  SiteAudit,
  SourceInfluenceMetrics,
  SourceTrustLevel,
  SourceType,
} from "@/types/analysis";

const ASSISTANTS: AssistantName[] = ["ChatGPT", "Gemini", "Alexa"];
const CLAIM_TYPES = ["brand", "price", "feature", "availability", "category", "trust", "description", "other"] as const;
const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh"] as const;
const PROMPT_BATCH_SIZE = 6;
const PROMPT_TIMEOUT_MS = 30000;

const BLOCKED_DOMAINS = [
  "reddit.com",
  "www.reddit.com",
  "wikipedia.org",
  "en.wikipedia.org",
  "medium.com",
  "www.medium.com",
  "quora.com",
  "www.quora.com",
];

const MARKETPLACE_DOMAINS = [
  "amazon.",
  "bestbuy.",
  "walmart.",
  "target.",
  "ebay.",
  "etsy.",
  "newegg.",
  "shopify.",
  "bhphotovideo.",
];

const REVIEW_DOMAINS = [
  "wirecutter.",
  "cnet.",
  "techradar.",
  "pcmag.",
  "tomsguide.",
  "soundguys.",
  "whathifi.",
  "reviewed.",
  "digitaltrends.",
  "laptopmag.",
  "creativebloq.",
  "howtogeek.",
  "androidcentral.",
  "engadget.",
  "theverge.",
  "rtings.",
  "trustedreviews.",
];

const DIRECTORY_DOMAINS = ["google.com", "maps.apple.com", "yelp.", "tripadvisor.", "merchantcenter."];

const QUERY_THEME_BUILDERS: Array<{
  theme: QueryTheme;
  build: (input: NewAnalysisInput) => string;
}> = [
  {
    theme: "best_of",
    build: (input) => `best 3 ${input.productCategory} for ${input.targetAudience} in ${input.location}`,
  },
  {
    theme: "budget",
    build: (input) => `cheapest ${input.productCategory} in ${input.location}`,
  },
  {
    theme: "simple",
    build: (input) => `simplest ${input.productCategory} for ${input.targetAudience}`,
  },
  {
    theme: "local",
    build: (input) => `${input.companyName} ${input.productName} near ${input.location}`,
  },
  {
    theme: "audience_fit",
    build: (input) => `best ${input.productCategory} for ${input.targetAudience} in ${input.location}`,
  },
  {
    theme: "trusted",
    build: (input) => `most trusted ${input.productCategory} brands in ${input.location}`,
  },
  {
    theme: "comparison",
    build: (input) =>
      `${input.companyName} ${input.productName} vs ${input.competitorBrands[0] ?? "other brands"} in ${input.location}`,
  },
];

const openAIPromptResultSchema = z.object({
  mentioned: z.boolean(),
  estimatedRank: z.number().int().min(1).max(10).nullable(),
  competitorsMentioned: z.array(z.string().min(1)).default([]),
  assistantSummary: z.string().min(1),
  observedDescription: z.string().min(1),
  claims: z
    .array(
      z.object({
        type: z.enum(CLAIM_TYPES).catch("other"),
        value: z.string().min(1),
        confidence: z.enum(["low", "medium", "high"]).default("medium"),
      }),
    )
    .default([]),
  citations: z
    .array(
      z.object({
        url: z.string().min(1),
        title: z.string().min(1).default("Untitled source"),
      }),
    )
    .default([]),
  reasoningNote: z.string().min(1),
});

const promptResponseFormat = zodTextFormat(openAIPromptResultSchema, "cubix_ai_monitor_result");
type OpenAIPromptPayload = z.infer<typeof openAIPromptResultSchema>;

const looseOpenAIPromptResultSchema = z
  .object({
    mentioned: z.boolean().optional(),
    estimatedRank: z.number().int().min(1).max(10).nullable().optional(),
    competitorsMentioned: z.array(z.string()).optional(),
    assistantSummary: z.string().optional(),
    observedDescription: z.string().optional(),
    claims: z
      .array(
        z.object({
          type: z.string().optional(),
          value: z.string().optional(),
          confidence: z.enum(["low", "medium", "high"]).optional(),
        }),
      )
      .optional(),
    citations: z
      .array(
        z.object({
          url: z.string().optional(),
          title: z.string().optional(),
        }),
      )
      .optional(),
    reasoningNote: z.string().optional(),
  })
  .passthrough();

interface WebsiteSnapshot {
  html: string;
  text: string;
}

interface OpenAIConfig {
  apiKey: string;
  model: string;
  reasoningEffort: (typeof REASONING_EFFORTS)[number];
}

interface QueryDefinition {
  assistant: AssistantName;
  theme: QueryTheme;
  query: string;
}

export class MissingOpenAIConfigError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured on the server.");
    this.name = "MissingOpenAIConfigError";
  }
}

export class OpenAIAnalysisError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "OpenAIAnalysisError";
    this.status = status;
  }
}

export class InvalidOpenAIResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOpenAIResponseError";
  }
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeDomainToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeClaimType(type: string): ClaimType {
  const lowered = type.toLowerCase().trim();
  return CLAIM_TYPES.includes(lowered as ClaimType) ? (lowered as ClaimType) : "other";
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractOutputText(response: { output_text?: string | null }) {
  return response.output_text?.trim() || "";
}

function stripCodeFence(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
}

function normalizePromptPayload(payload: z.infer<typeof looseOpenAIPromptResultSchema>): OpenAIPromptPayload {
  const normalizedClaims = (payload.claims ?? [])
    .map((claim) => ({
      type: normalizeClaimType(claim.type ?? ""),
      value: claim.value?.trim() ?? "",
      confidence: claim.confidence ?? "medium",
    }))
    .filter((claim) => claim.value.length > 0)
    .slice(0, 3);

  const normalizedCitations = (payload.citations ?? [])
    .map((citation) => ({
      url: citation.url?.trim() ?? "",
      title: citation.title?.trim() || "Untitled source",
    }))
    .filter((citation) => citation.url.length > 0)
    .slice(0, 4);

  const assistantSummary =
    payload.assistantSummary?.trim() ||
    payload.observedDescription?.trim() ||
    payload.reasoningNote?.trim() ||
    "No grounded assistant-style answer could be verified for this query.";
  const observedDescription =
    payload.observedDescription?.trim() || assistantSummary || "No grounded description captured.";
  const reasoningNote =
    payload.reasoningNote?.trim() ||
    payload.assistantSummary?.trim() ||
    "No grounded explanation was returned for this monitored query.";

  return {
    mentioned: payload.mentioned ?? false,
    estimatedRank: payload.mentioned ? payload.estimatedRank ?? null : null,
    competitorsMentioned: (payload.competitorsMentioned ?? [])
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6),
    assistantSummary,
    observedDescription,
    claims: normalizedClaims,
    citations: normalizedCitations,
    reasoningNote,
  };
}

function tryParsePromptPayload(outputText: string): OpenAIPromptPayload | null {
  const candidates = Array.from(
    new Set(
      [outputText, stripCodeFence(outputText), extractJsonObject(outputText), extractJsonObject(stripCodeFence(outputText))]
        .filter((value): value is string => Boolean(value && value.trim())),
    ),
  );

  for (const candidate of candidates) {
    try {
      return openAIPromptResultSchema.parse(JSON.parse(candidate));
    } catch {
      try {
        const parsed = looseOpenAIPromptResultSchema.parse(JSON.parse(candidate));
        return normalizePromptPayload(parsed);
      } catch {
        continue;
      }
    }
  }

  return null;
}

function getOpenAIConfig(): OpenAIConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new MissingOpenAIConfigError();
  }

  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT?.trim().toLowerCase() ?? "low";
  const normalizedEffort =
    reasoningEffort === "minimal" || reasoningEffort === "none" || reasoningEffort === "xhigh" ? "low" : reasoningEffort;

  return {
    apiKey,
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
    reasoningEffort: REASONING_EFFORTS.includes(normalizedEffort as (typeof REASONING_EFFORTS)[number])
      ? (normalizedEffort as (typeof REASONING_EFFORTS)[number])
      : "low",
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new OpenAIAnalysisError("Timed out while gathering AI monitoring results.", 504));
      }, timeoutMs);
    }),
  ]);
}

async function fetchWebsiteSnapshot(websiteUrl: string): Promise<WebsiteSnapshot> {
  try {
    const response = await fetch(websiteUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": "CubixAI-Monitor/1.0",
      },
    });

    const html = response.ok ? await response.text() : "";

    return {
      html,
      text: stripHtml(html).toLowerCase(),
    };
  } catch {
    return {
      html: "",
      text: "",
    };
  }
}

function buildSiteAudit(input: NewAnalysisInput, snapshot: WebsiteSnapshot): SiteAudit {
  const checks: SiteAudit["checks"] = [];
  const issues: string[] = [];
  const suggestions: string[] = [];
  const text = snapshot.html.toLowerCase();

  const locationToken = input.location.split(",")[0]?.trim().toLowerCase() ?? "";
  const audienceToken = input.targetAudience.split(" ")[0]?.trim().toLowerCase() ?? "";
  const categoryToken = input.productCategory.split(" ")[0]?.trim().toLowerCase() ?? "";

  const flags = [
    { label: "Page title", ok: /<title>[\s\S]*?<\/title>/.test(text), note: "Add a descriptive title on the monitored product page." },
    {
      label: "Meta description",
      ok: /<meta[^>]*name=["']description["'][^>]*>/.test(text),
      note: "Add a clear product meta description that mirrors the brand's positioning.",
    },
    {
      label: "Structured data",
      ok: text.includes("application/ld+json") || text.includes("schema.org") || text.includes("itemtype="),
      note: "Add product schema and merchant data so assistants can pull authoritative facts.",
    },
    {
      label: "FAQ / how-to content",
      ok: text.includes("faq") || text.includes("frequently asked") || text.includes("how to"),
      note: "Publish FAQ or how-to content that covers shopping objections and comparisons.",
    },
    {
      label: "Audience relevance",
      ok: audienceToken.length > 2 && text.includes(audienceToken),
      note: "Reflect the target audience language more directly in product copy.",
    },
    {
      label: "Location or availability signals",
      ok: (locationToken.length > 2 && text.includes(locationToken)) || text.includes("pickup") || text.includes("delivery"),
      note: "Add local inventory, delivery, or location cues for region-specific queries.",
    },
    {
      label: "Trust signals",
      ok: text.includes("reviews") || text.includes("shipping") || text.includes("returns") || text.includes("warranty"),
      note: "Strengthen trust signals such as reviews, returns, warranty, and shipping clarity.",
    },
    {
      label: "Category clarity",
      ok: categoryToken.length > 2 && text.includes(categoryToken),
      note: "Use the product category wording more consistently to help retrieval and ranking.",
    },
  ];

  for (const flag of flags) {
    if (flag.ok) {
      checks.push({ label: flag.label, status: "pass", note: "Detected" });
      continue;
    }

    if (snapshot.html) {
      checks.push({ label: flag.label, status: "warning", note: flag.note });
      issues.push(`${flag.label} is currently weak.`);
      suggestions.push(flag.note);
      continue;
    }

    checks.push({ label: flag.label, status: "missing", note: "Could not reliably inspect the monitored page." });
    issues.push(`${flag.label} could not be verified because the monitored page was not accessible.`);
  }

  const passCount = checks.filter((item) => item.status === "pass").length;
  const warningCount = checks.filter((item) => item.status === "warning").length;
  const missingCount = checks.filter((item) => item.status === "missing").length;
  const score = clamp(Math.round(passCount * 12 + warningCount * 6 + missingCount * 2), 0, 100);

  return {
    auditedUrl: input.productPageUrl?.trim() || input.companyWebsite,
    score,
    checks,
    issues,
    suggestions: Array.from(new Set(suggestions)).slice(0, 6),
  };
}

function buildSafetyIdentifier(input: NewAnalysisInput) {
  return createHash("sha256")
    .update(`${input.companyName}|${input.productName}|${input.location}|${input.productCategory}`)
    .digest("hex")
    .slice(0, 32);
}

function buildQueryLibrary(input: NewAnalysisInput): QueryDefinition[] {
  const uniqueQueries = new Set<string>();
  const library: QueryDefinition[] = [];

  for (const assistant of ASSISTANTS) {
    for (const theme of QUERY_THEME_BUILDERS) {
      const query = theme.build(input);
      const uniqueKey = `${assistant}:${query.toLowerCase()}`;

      if (uniqueQueries.has(uniqueKey)) continue;
      uniqueQueries.add(uniqueKey);
      library.push({
        assistant,
        theme: theme.theme,
        query,
      });
    }
  }

  return library;
}

function buildPromptInstructions(input: NewAnalysisInput, queryDefinition: QueryDefinition) {
  return [
    "You are monitoring assistant-style shopping answers for a commerce analytics dashboard.",
    `Assistant surface: ${queryDefinition.assistant}`,
    `Target company: ${input.companyName}`,
    `Target product: ${input.productName}`,
    `Company website: ${input.companyWebsite}`,
    input.productPageUrl ? `Product page URL: ${input.productPageUrl}` : null,
    `Product category: ${input.productCategory}`,
    `Target audience: ${input.targetAudience}`,
    `Location context: ${input.location}`,
    `Competitor brands: ${input.competitorBrands.join(", ")}`,
    `Authoritative product facts: ${input.authoritativeFacts}`,
    `Shopping query to monitor: ${queryDefinition.query}`,
    "Use web search to approximate the answer this assistant surface could give for the shopping query.",
    "Return mentioned=true only when the target company or product is clearly present in grounded shopping recommendations.",
    "Only include HTTPS citations. Prefer official brand pages, reputable retailers, and major review publications.",
    "If you cannot verify grounded evidence, set mentioned=false, estimatedRank=null, claims=[], citations=[], and explain that evidence was insufficient.",
    "observedDescription must summarize how the product or brand is described in the grounded answer.",
    "Keep assistantSummary, observedDescription, and reasoningNote each short and concrete.",
    "Extract up to 2 factual claims about price, features, availability, trust, or description.",
    "Return up to 2 citations in the JSON. Additional web search sources will be collected separately.",
    "Do not invent citations, rankings, or product versions.",
    "Return JSON only.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCompactPromptInstructions(input: NewAnalysisInput, queryDefinition: QueryDefinition) {
  return [
    buildPromptInstructions(input, queryDefinition),
    "Retry mode: keep every string under 25 words where possible.",
    "If grounded evidence exists but exact ranking is uncertain, set estimatedRank=null.",
    "Do not add any commentary outside the JSON object.",
  ].join("\n");
}

function matchCompetitorDomain(domain: string, competitorBrands: string[]) {
  const normalizedDomain = normalizeDomainToken(domain);
  return competitorBrands.some((brand) => {
    const token = normalizeDomainToken(brand);
    return token.length > 3 && normalizedDomain.includes(token);
  });
}

function classifySource(
  url: string,
  targetHostname: string,
  competitorBrands: string[],
): Pick<Citation, "domain" | "sourceType" | "trustLevel" | "isOfficial" | "isCompetitorSource" | "secure"> {
  const parsed = new URL(url);
  const domain = parsed.hostname.toLowerCase();
  const secure = parsed.protocol === "https:";
  const isOfficial = Boolean(targetHostname && (domain === targetHostname || domain.endsWith(`.${targetHostname}`)));
  const isCompetitorSource = matchCompetitorDomain(domain, competitorBrands);

  if (isOfficial) {
    return {
      domain,
      sourceType: "official",
      trustLevel: "high",
      isOfficial,
      isCompetitorSource: false,
      secure,
    };
  }

  if (isCompetitorSource) {
    return {
      domain,
      sourceType: "competitor",
      trustLevel: "medium",
      isOfficial,
      isCompetitorSource: true,
      secure,
    };
  }

  if (MARKETPLACE_DOMAINS.some((token) => domain.includes(token))) {
    return {
      domain,
      sourceType: "marketplace",
      trustLevel: "medium",
      isOfficial,
      isCompetitorSource: false,
      secure,
    };
  }

  if (REVIEW_DOMAINS.some((token) => domain.includes(token))) {
    return {
      domain,
      sourceType: "review",
      trustLevel: "medium",
      isOfficial,
      isCompetitorSource: false,
      secure,
    };
  }

  if (DIRECTORY_DOMAINS.some((token) => domain.includes(token))) {
    return {
      domain,
      sourceType: "directory",
      trustLevel: "low",
      isOfficial,
      isCompetitorSource: false,
      secure,
    };
  }

  if (
    domain.includes("blog") ||
    domain.includes("news") ||
    domain.includes("magazine") ||
    domain.includes("journal") ||
    domain.includes("press")
  ) {
    return {
      domain,
      sourceType: "editorial",
      trustLevel: "medium",
      isOfficial,
      isCompetitorSource: false,
      secure,
    };
  }

  return {
    domain,
    sourceType: "unknown",
    trustLevel: "low",
    isOfficial,
    isCompetitorSource: false,
    secure,
  };
}

function dedupeCitations(
  citations: Array<{ url: string; title?: string }>,
  targetHostname: string,
  competitorBrands: string[],
): Citation[] {
  const byUrl = new Map<string, Citation>();

  for (const citation of citations) {
    try {
      const parsed = new URL(citation.url);
      const normalizedUrl = parsed.toString();
      const domain = parsed.hostname.toLowerCase();

      if (parsed.protocol !== "https:") continue;
      if (BLOCKED_DOMAINS.some((blockedDomain) => domain === blockedDomain || domain.endsWith(`.${blockedDomain}`))) {
        continue;
      }

      if (byUrl.has(normalizedUrl)) continue;

      const sourceMeta = classifySource(normalizedUrl, targetHostname, competitorBrands);

      byUrl.set(normalizedUrl, {
        url: normalizedUrl,
        title: citation.title?.trim() || domain,
        ...sourceMeta,
      });
    } catch {
      continue;
    }
  }

  return Array.from(byUrl.values()).slice(0, 8);
}

function extractNestedCitations(value: unknown): Array<{ url: string; title?: string }> {
  const collected: Array<{ url: string; title?: string }> = [];

  function walk(entry: unknown) {
    if (!entry || typeof entry !== "object") return;

    if (Array.isArray(entry)) {
      entry.forEach(walk);
      return;
    }

    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.url === "string") {
      collected.push({
        url: candidate.url,
        title: typeof candidate.title === "string" ? candidate.title : undefined,
      });
    }

    Object.values(candidate).forEach(walk);
  }

  walk(value);
  return collected;
}

function normalizeCompetitorMentions(mentions: string[], inputCompetitors: string[]) {
  const normalizedInput = inputCompetitors.map((name) => ({
    raw: name,
    normalized: normalizeText(name),
  }));

  const seen = new Set<string>();
  const output: string[] = [];

  for (const mention of mentions) {
    const normalizedMention = normalizeText(mention);
    const matched = normalizedInput.find(
      (candidate) =>
        normalizedMention.includes(candidate.normalized) || candidate.normalized.includes(normalizedMention),
    );
    const resolved = matched?.raw ?? mention.trim();

    if (!resolved || seen.has(resolved.toLowerCase())) continue;
    seen.add(resolved.toLowerCase());
    output.push(resolved);
  }

  return output.slice(0, 6);
}

function hasKeywordSupport(claimValue: string, corpus: string) {
  const tokens = Array.from(
    new Set(
      normalizeText(claimValue)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length > 3),
    ),
  );

  if (tokens.length === 0) {
    return false;
  }

  const matches = tokens.filter((token) => corpus.includes(token)).length;
  return matches >= Math.min(2, tokens.length);
}

function compareClaimAgainstMerchantTruth(
  claim: ExtractedClaim,
  queryResult: QueryResult,
  input: NewAnalysisInput,
  websiteText: string,
): AccuracyFinding {
  const claimValue = normalizeText(claim.value);
  const factsText = normalizeText(input.authoritativeFacts);
  const companyName = normalizeText(input.companyName);
  const productName = normalizeText(input.productName);
  const category = normalizeText(input.productCategory);

  if (claim.type === "brand") {
    const verified =
      claimValue.includes(companyName) ||
      companyName.includes(claimValue) ||
      claimValue.includes(productName) ||
      productName.includes(claimValue);

    return {
      assistant: queryResult.assistant,
      query: queryResult.query,
      claimType: claim.type,
      claimValue: claim.value,
      status: verified ? "verified" : "warning",
      severity: "medium",
      note: verified
        ? "Brand naming aligns with the submitted product or company."
        : "Brand naming in the response does not cleanly match the submitted product or company.",
      sourceUrl: queryResult.citations[0]?.url,
    };
  }

  if (claim.type === "category") {
    const verified = claimValue.includes(category) || category.includes(claimValue);
    return {
      assistant: queryResult.assistant,
      query: queryResult.query,
      claimType: claim.type,
      claimValue: claim.value,
      status: verified ? "verified" : "warning",
      severity: "low",
      note: verified
        ? "Category wording aligns with the submitted product category."
        : "Category wording does not line up cleanly with the submitted product category.",
      sourceUrl: queryResult.citations[0]?.url,
    };
  }

  const supportedByFacts = hasKeywordSupport(claim.value, factsText);
  const supportedBySite = hasKeywordSupport(claim.value, websiteText);
  const severity = claim.type === "price" || claim.type === "availability" ? "high" : "medium";

  if (supportedByFacts || supportedBySite) {
    return {
      assistant: queryResult.assistant,
      query: queryResult.query,
      claimType: claim.type,
      claimValue: claim.value,
      status: "verified",
      severity,
      note: supportedByFacts
        ? "Claim is supported by the authoritative product facts supplied for this run."
        : "Claim is supported by the crawled website content.",
      sourceUrl: queryResult.citations[0]?.url,
    };
  }

  return {
    assistant: queryResult.assistant,
    query: queryResult.query,
    claimType: claim.type,
    claimValue: claim.value,
    status: "warning",
    severity,
    note: "Claim was not found in the submitted product facts or the monitored website content and should be reviewed by a human.",
    sourceUrl: queryResult.citations[0]?.url,
  };
}

function mapOpenAIError(error: unknown): OpenAIAnalysisError {
  if (error instanceof OpenAIAnalysisError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "OpenAI request failed.";

  if (typeof error === "object" && error !== null) {
    const candidate = error as { status?: number; code?: string };

    if (candidate.status === 429 || candidate.code === "rate_limit_exceeded") {
      return new OpenAIAnalysisError("OpenAI rate limit reached. Try again shortly.", 429);
    }

    if (candidate.status === 401 || candidate.status === 403) {
      return new OpenAIAnalysisError("OpenAI authentication failed. Check the server API key.", 502);
    }

    if (candidate.status && candidate.status >= 500) {
      return new OpenAIAnalysisError("OpenAI is temporarily unavailable. Try again shortly.", 503);
    }

    if (candidate.status && candidate.status >= 400) {
      return new OpenAIAnalysisError(message, candidate.status);
    }
  }

  return new OpenAIAnalysisError(message, 502);
}

function getSourceTrust(citations: Citation[]): QueryResult["sourceTrust"] {
  if (citations.length === 0) return "weak";
  if (citations.some((citation) => citation.isOfficial) || citations.filter((citation) => citation.trustLevel !== "low").length >= 3) {
    return "strong";
  }
  if (citations.some((citation) => citation.trustLevel !== "low")) {
    return "mixed";
  }
  return "weak";
}

async function analyzePromptWithOpenAI(
  client: OpenAI,
  config: OpenAIConfig,
  input: NewAnalysisInput,
  queryDefinition: QueryDefinition,
  targetHostname: string,
  safetyIdentifier: string,
): Promise<QueryResult> {
  const baseParams: ResponseCreateParamsNonStreaming = {
    model: config.model,
    instructions:
      "You monitor AI assistant shopping visibility for a brand. Use web search and return only valid JSON that matches the schema.",
    input: buildPromptInstructions(input, queryDefinition),
    tools: [{ type: "web_search", search_context_size: "low" }],
    include: ["web_search_call.action.sources"],
    text: { format: promptResponseFormat },
    max_output_tokens: 900,
    reasoning: { effort: config.reasoningEffort },
    safety_identifier: safetyIdentifier,
  };

  async function requestMonitoringPayload(params: ResponseCreateParamsNonStreaming) {
    let response: OpenAIResponse;

    try {
      response = await withTimeout(client.responses.create(params), PROMPT_TIMEOUT_MS);

      if (
        extractOutputText(response).length === 0 &&
        response.status === "incomplete" &&
        response.incomplete_details?.reason === "max_output_tokens"
      ) {
        response = await withTimeout(
          client.responses.create({
            ...params,
            max_output_tokens: Math.max(params.max_output_tokens ?? 900, 1300),
            reasoning: { effort: "low" },
          }),
          PROMPT_TIMEOUT_MS,
        );
      }
    } catch (error) {
      throw mapOpenAIError(error);
    }

    return response;
  }

  let response = await requestMonitoringPayload(baseParams);
  let outputText = extractOutputText(response);
  let parsedPayload = outputText ? tryParsePromptPayload(outputText) : null;

  if (!parsedPayload) {
    response = await requestMonitoringPayload({
      ...baseParams,
      input: buildCompactPromptInstructions(input, queryDefinition),
      max_output_tokens: 1200,
      reasoning: { effort: "low" },
    });
    outputText = extractOutputText(response);
    parsedPayload = outputText ? tryParsePromptPayload(outputText) : null;
  }

  if (!outputText) {
    throw new InvalidOpenAIResponseError("OpenAI returned an empty monitoring payload.");
  }

  if (!parsedPayload) {
    throw new InvalidOpenAIResponseError("OpenAI returned monitoring data in an unexpected format.");
  }

  const mergedCitations = dedupeCitations(
    [...parsedPayload.citations, ...extractNestedCitations(response)],
    targetHostname,
    input.competitorBrands,
  );

  const grounded = mergedCitations.length > 0;
  const mentioned = grounded ? parsedPayload.mentioned : false;
  const estimatedRank = mentioned ? parsedPayload.estimatedRank : null;

  return {
    assistant: queryDefinition.assistant,
    theme: queryDefinition.theme,
    query: queryDefinition.query,
    mentioned,
    estimatedRank,
    productPosition: !mentioned ? "not_visible" : (estimatedRank ?? 99) <= 3 ? "top_3" : "mentioned",
    competitorsMentioned: normalizeCompetitorMentions(parsedPayload.competitorsMentioned, input.competitorBrands),
    explanation: grounded
      ? parsedPayload.reasoningNote
      : "No secure grounded evidence was strong enough to verify visibility for this monitored query.",
    assistantSummary: grounded
      ? parsedPayload.assistantSummary
      : "No grounded assistant-style answer could be verified for this query.",
    observedDescription: grounded ? parsedPayload.observedDescription : "No grounded description captured.",
    claims: grounded
      ? parsedPayload.claims.map((claim) => ({
          type: normalizeClaimType(claim.type),
          value: claim.value.trim(),
          confidence: claim.confidence,
        }))
      : [],
    citations: mergedCitations,
    sourceTrust: getSourceTrust(mergedCitations),
  };
}

function buildSourceInfluenceMetrics(sourcesReviewed: Citation[]): SourceInfluenceMetrics {
  const sourceTypeBreakdown: Record<SourceType, number> = {
    official: 0,
    competitor: 0,
    marketplace: 0,
    review: 0,
    editorial: 0,
    directory: 0,
    unknown: 0,
  };

  const domainCounts = new Map<string, { count: number; trustLevel: SourceTrustLevel }>();

  for (const source of sourcesReviewed) {
    sourceTypeBreakdown[source.sourceType] += 1;

    const existing = domainCounts.get(source.domain);
    if (existing) {
      existing.count += 1;
      if (existing.trustLevel === "low" && source.trustLevel !== "low") {
        existing.trustLevel = source.trustLevel;
      }
    } else {
      domainCounts.set(source.domain, {
        count: 1,
        trustLevel: source.trustLevel,
      });
    }
  }

  const total = sourcesReviewed.length;

  return {
    officialSourceShare: total ? Math.round((sourcesReviewed.filter((source) => source.isOfficial).length / total) * 100) : 0,
    competitorSourceShare: total
      ? Math.round((sourcesReviewed.filter((source) => source.isCompetitorSource).length / total) * 100)
      : 0,
    secureHttpsRate: total ? Math.round((sourcesReviewed.filter((source) => source.secure).length / total) * 100) : 0,
    sourceTypeBreakdown,
    dominantDomains: Array.from(domainCounts.entries())
      .map(([domain, meta]) => ({
        domain,
        count: meta.count,
        trustLevel: meta.trustLevel,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6),
  };
}

function buildAccuracyMetrics(results: QueryResult[], findings: AccuracyFinding[]): AccuracyMetrics {
  const groundedQueries = results.filter((result) => result.citations.length > 0).length;
  const zeroEvidenceQueries = results.length - groundedQueries;
  const queriesWithClaims = results.filter((result) => result.claims.length > 0).length;
  const totalClaims = findings.length;
  const verifiedClaims = findings.filter((finding) => finding.status === "verified").length;
  const flaggedClaims = findings.filter((finding) => finding.status !== "verified").length;
  const claimValidationRate = totalClaims ? Math.round((verifiedClaims / totalClaims) * 100) : 0;
  const evidenceCoverageRate = results.length ? Math.round((groundedQueries / results.length) * 100) : 0;
  const factCheckCoverageRate = groundedQueries ? Math.round((queriesWithClaims / groundedQueries) * 100) : 0;
  const rawAccuracyRate = totalClaims
    ? Math.round(claimValidationRate * 0.45 + factCheckCoverageRate * 0.2 + evidenceCoverageRate * 0.35)
    : Math.round(evidenceCoverageRate * 0.25);
  const accuracyRate =
    evidenceCoverageRate < 40
      ? Math.min(rawAccuracyRate, evidenceCoverageRate + 20)
      : evidenceCoverageRate < 60
        ? Math.min(rawAccuracyRate, evidenceCoverageRate + 25)
        : rawAccuracyRate;

  return {
    totalClaims,
    verifiedClaims,
    flaggedClaims,
    groundedQueries,
    zeroEvidenceQueries,
    queriesWithClaims,
    evidenceCoverageRate,
    factCheckCoverageRate,
    claimValidationRate,
    accuracyRate,
    humanReviewRequired:
      flaggedClaims > 0 ||
      zeroEvidenceQueries > Math.floor(results.length * 0.3) ||
      factCheckCoverageRate < 50,
  };
}

function buildAssistantCoverage(results: QueryResult[], accuracyFindings: AccuracyFinding[]): AssistantCoverage[] {
  return ASSISTANTS.map((assistant) => {
    const assistantResults = results.filter((result) => result.assistant === assistant);
    const appearances = assistantResults.filter((result) => result.mentioned).length;
    const ranked = assistantResults.filter((result) => result.estimatedRank !== null);
    const flaggedClaims = accuracyFindings.filter(
      (finding) => finding.assistant === assistant && finding.status !== "verified",
    ).length;

    return {
      assistant,
      queriesRun: assistantResults.length,
      appearances,
      shareOfShelf: assistantResults.length ? Math.round((appearances / assistantResults.length) * 100) : 0,
      averageRank: ranked.length
        ? Number(
            (ranked.reduce((sum, result) => sum + (result.estimatedRank ?? 0), 0) / ranked.length).toFixed(1),
          )
        : null,
      flaggedClaims,
    };
  });
}

function buildEthicsSummary(
  accuracyMetrics: AccuracyMetrics,
  sourceInfluence: SourceInfluenceMetrics,
): AnalysisOutput["ethicsSummary"] {
  if (
    accuracyMetrics.flaggedClaims === 0 &&
    accuracyMetrics.evidenceCoverageRate >= 70 &&
    accuracyMetrics.factCheckCoverageRate >= 55 &&
    accuracyMetrics.claimValidationRate >= 85 &&
    sourceInfluence.officialSourceShare >= 25
  ) {
    return {
      status: "healthy",
      hallucinationRisk: "low",
      flaggedClaimCount: 0,
      note: "Claims were grounded cleanly against the submitted product facts and the source mix includes enough official material to trust the run.",
    };
  }

  if (
    accuracyMetrics.accuracyRate < 45 ||
    accuracyMetrics.evidenceCoverageRate < 30 ||
    accuracyMetrics.zeroEvidenceQueries > accuracyMetrics.groundedQueries ||
    sourceInfluence.officialSourceShare < 10
  ) {
    return {
      status: "critical",
      hallucinationRisk: "high",
      flaggedClaimCount: accuracyMetrics.flaggedClaims,
      note: "The run is vulnerable to hallucinations, weak evidence coverage, or poor upstream data. Review flagged claims, expand authoritative facts, and improve official source coverage before treating the output as decision-grade.",
    };
  }

  return {
    status: "review",
    hallucinationRisk: "medium",
    flaggedClaimCount: accuracyMetrics.flaggedClaims,
    note: "Visibility can be monitored, but at least some claims, evidence gaps, or source patterns still need human review before they should drive content or merchandising decisions.",
  };
}

function buildBriefCoverage(
  output: Pick<
    AnalysisOutput,
    "queriesAnalyzed" | "assistantsMonitored" | "shareOfShelf" | "sourceInfluence" | "accuracyMetrics" | "ethicsSummary" | "siteAudit" | "recommendations"
  >,
): BriefCoverage {
  const items: BriefCoverage["items"] = [
    {
      label: "Tracks whether the brand appears in AI answers",
      status: output.queriesAnalyzed >= 12 && output.assistantsMonitored.length >= 3 ? "answered" : output.queriesAnalyzed > 0 ? "partial" : "missing",
      note:
        output.queriesAnalyzed > 0
          ? `${output.queriesAnalyzed} shopping-style queries were monitored across ${output.assistantsMonitored.join(", ")}. Share of shelf is ${output.shareOfShelf}%.`
          : "No monitored query set was completed.",
    },
    {
      label: "Explains what information the AI relied on",
      status:
        output.sourceInfluence.secureHttpsRate > 0 && output.sourceInfluence.officialSourceShare >= 20
          ? "answered"
        : output.sourceInfluence.secureHttpsRate > 0
          ? "partial"
          : "missing",
      note:
        output.sourceInfluence.secureHttpsRate > 0
          ? `${output.sourceInfluence.officialSourceShare}% of retained sources were official and ${output.sourceInfluence.competitorSourceShare}% were competitor-controlled.`
          : "No secure source evidence was retained for the run.",
    },
    {
      label: "Produces optimization recommendations",
      status:
        output.recommendations.length >= 3 && output.siteAudit.suggestions.length > 0
          ? "answered"
          : output.recommendations.length > 0
            ? "partial"
            : "missing",
      note:
        output.recommendations.length > 0
          ? `${output.recommendations.length} recommendations were produced from visibility, source, and site-readiness signals.`
          : "No actionable optimization guidance was generated.",
    },
    {
      label: "Checks ethics and factual accuracy",
      status:
        output.accuracyMetrics.queriesWithClaims > 0 && output.accuracyMetrics.evidenceCoverageRate >= 50
          ? "answered"
          : output.accuracyMetrics.groundedQueries > 0 || output.ethicsSummary.status !== "healthy"
            ? "partial"
            : "missing",
      note:
        output.accuracyMetrics.queriesWithClaims > 0
          ? `${output.accuracyMetrics.factCheckCoverageRate}% of grounded queries produced claims for fact-checking and ${output.accuracyMetrics.flaggedClaims} claim(s) were flagged.`
          : "The run detected evidence patterns but extracted too few fact-checkable claims to call this complete.",
    },
    {
      label: "Shows measurable outcomes for the business case",
      status:
        output.shareOfShelf > 0 || output.accuracyMetrics.evidenceCoverageRate > 0
          ? "answered"
          : "partial",
      note: `The dashboard reports share of shelf, visibility score, evidence coverage, and ethics status for each run.`,
    },
  ];

  const score = Math.round(
    items.reduce((sum, item) => sum + (item.status === "answered" ? 100 : item.status === "partial" ? 50 : 0), 0) /
      items.length,
  );

  return {
    score,
    items,
  };
}

function buildRecommendations(
  input: NewAnalysisInput,
  output: AnalysisOutput,
): string[] {
  const recs = new Set<string>();

  if (output.shareOfShelf < 45) {
    recs.add(`Create a sharper set of ${input.location}-aware landing pages and comparison content so ${input.productName} appears in more shopping-style AI answers.`);
    recs.add(`Publish at least 20 reusable shopping query targets around ${input.productCategory}, ${input.targetAudience}, price, simplicity, and local intent.`);
  }

  if (output.sourceInfluence.officialSourceShare < 35) {
    recs.add("Strengthen official product pages, schema.org markup, and merchant feeds so assistants rely less on competitors and generic publishers.");
  }

  if (output.accuracyMetrics.evidenceCoverageRate < 60) {
    recs.add("A large share of monitored queries returned weak or missing grounded evidence; expand official landing pages and retailer/distribution coverage for more query scenarios.");
  }

  if (output.accuracyMetrics.factCheckCoverageRate < 50) {
    recs.add("Improve fact-check coverage by supplying more structured authoritative facts such as price, variants, availability, and location-specific fulfilment details.");
  }

  if (output.accuracyMetrics.accuracyRate < 85) {
    recs.add("Expand the authoritative facts block with pricing, availability, differentiators, and audience-specific use cases to reduce hallucinations.");
  }

  if (output.accuracyMetrics.flaggedClaims > 0) {
    recs.add("Route flagged claims into a human review workflow before using them in recommendations or outbound reporting.");
  }

  if (output.sourceInfluence.competitorSourceShare > 30) {
    recs.add("Competitor sources are influencing too many answers; publish comparison pages and retailer-ready product data to reclaim narrative control.");
  }

  if (output.siteAudit.suggestions.length > 0) {
    output.siteAudit.suggestions.forEach((suggestion) => recs.add(suggestion));
  }

  if (input.goal === "improve local ranking") {
    recs.add(`Add local inventory, store availability, or location-specific fulfilment cues for ${input.location}.`);
  }

  if (input.goal === "reduce factual errors") {
    recs.add("Track accuracy rate and flagged claim count alongside conversions so trust improvements can be tied to business outcomes.");
  }

  recs.add("Keep only secure HTTPS sources in reporting and escalate low-trust or uncited findings for manual verification.");

  return Array.from(recs).slice(0, 8);
}

function buildExecutiveSummary(
  output: Pick<
    AnalysisOutput,
    "shareOfShelf" | "averageRank" | "sourceInfluence" | "accuracyMetrics" | "ethicsSummary" | "briefCoverage"
  >,
) {
  return `The brand appeared in ${output.shareOfShelf}% of monitored assistant-style shopping queries. Average ranking landed at ${
    output.averageRank ?? "unranked"
  }, official sources made up ${output.sourceInfluence.officialSourceShare}% of retained citations, evidence coverage landed at ${output.accuracyMetrics.evidenceCoverageRate}%, overall accuracy confidence scored ${output.accuracyMetrics.accuracyRate}%, and the project currently answers ${output.briefCoverage.score}% of the target brief. Ethics status is ${output.ethicsSummary.status}.`;
}

export async function runOpenAIAnalysis(input: NewAnalysisInput): Promise<AnalysisOutput> {
  const config = getOpenAIConfig();
  const client = new OpenAI({ apiKey: config.apiKey });
  const queries = buildQueryLibrary(input);
  const targetHostname = safeHostname(input.productPageUrl?.trim() || input.companyWebsite).toLowerCase();
  const safetyIdentifier = buildSafetyIdentifier(input);
  const websiteSnapshot = await fetchWebsiteSnapshot(input.productPageUrl?.trim() || input.companyWebsite);
  const siteAudit = buildSiteAudit(input, websiteSnapshot);
  const results: QueryResult[] = [];
  let firstError: OpenAIAnalysisError | InvalidOpenAIResponseError | null = null;

  for (let index = 0; index < queries.length; index += PROMPT_BATCH_SIZE) {
    const batch = queries.slice(index, index + PROMPT_BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((queryDefinition) =>
        analyzePromptWithOpenAI(client, config, input, queryDefinition, targetHostname, safetyIdentifier),
      ),
    );

    for (let batchIndex = 0; batchIndex < batchResults.length; batchIndex += 1) {
      const settledResult = batchResults[batchIndex];
      const queryDefinition = batch[batchIndex];

      if (settledResult.status === "fulfilled") {
        results.push(settledResult.value);
        continue;
      }

      const mappedError =
        settledResult.reason instanceof InvalidOpenAIResponseError
          ? settledResult.reason
          : mapOpenAIError(settledResult.reason);

      firstError ??= mappedError;

      results.push({
        assistant: queryDefinition.assistant,
        theme: queryDefinition.theme,
        query: queryDefinition.query,
        mentioned: false,
        estimatedRank: null,
        productPosition: "not_visible",
        competitorsMentioned: [],
        explanation:
          mappedError instanceof InvalidOpenAIResponseError
            ? "OpenAI returned an invalid structured payload for this monitored query."
            : "OpenAI could not complete this monitored query with grounded evidence.",
        assistantSummary: "No grounded assistant-style answer could be verified for this query.",
        observedDescription: "No grounded description captured.",
        claims: [],
        citations: [],
        sourceTrust: "weak",
      });
    }
  }

  if (results.every((result) => result.citations.length === 0) && firstError) {
    throw firstError;
  }

  const mentions = results.filter((result) => result.mentioned);
  const rankedMentions = mentions.filter((result) => result.estimatedRank !== null);

  const averageRank = rankedMentions.length
    ? Number(
        (rankedMentions.reduce((sum, result) => sum + (result.estimatedRank ?? 0), 0) / rankedMentions.length).toFixed(1),
      )
    : null;

  const shareOfShelf = Math.round((mentions.length / results.length) * 100);
  const sourcesReviewed = dedupeCitations(
    results.flatMap((result) => result.citations.map((citation) => ({ url: citation.url, title: citation.title }))),
    targetHostname,
    input.competitorBrands,
  );

  const accuracyFindings = results
    .flatMap((result) => result.claims.map((claim) => compareClaimAgainstMerchantTruth(claim, result, input, websiteSnapshot.text)))
    .slice(0, 24);

  const sourceInfluence = buildSourceInfluenceMetrics(sourcesReviewed);
  const accuracyMetrics = buildAccuracyMetrics(results, accuracyFindings);
  const ethicsSummary = buildEthicsSummary(accuracyMetrics, sourceInfluence);
  const assistantCoverage = buildAssistantCoverage(results, accuracyFindings);
  const briefCoverage = buildBriefCoverage({
    queriesAnalyzed: results.length,
    assistantsMonitored: ASSISTANTS,
    shareOfShelf,
    sourceInfluence,
    accuracyMetrics,
    ethicsSummary,
    siteAudit,
    recommendations: [],
  });

  const rankScore = averageRank ? clamp(Math.round((11 - averageRank) * 10), 0, 100) : 20;
  const visibilityScore = clamp(
    Math.round(
      shareOfShelf * 0.45 +
        rankScore * 0.2 +
        sourceInfluence.officialSourceShare * 0.15 +
        accuracyMetrics.accuracyRate * 0.2,
    ),
    0,
    100,
  );

  const outputBase: AnalysisOutput = {
    analysisProvider: "openai",
    monitoringMode: "assistant-search-monitor",
    assistantsMonitored: ASSISTANTS,
    queriesAnalyzed: results.length,
    executiveSummary: "",
    shareOfShelf,
    averageRank,
    visibilityScore,
    sourceInfluence,
    accuracyMetrics,
    ethicsSummary,
    briefCoverage,
    assistantCoverage,
    siteAudit,
    results,
    recommendations: [],
    sourcesReviewed,
    accuracyFindings,
  };

  const recommendations = buildRecommendations(input, outputBase);
  const finalBriefCoverage = buildBriefCoverage({
    queriesAnalyzed: results.length,
    assistantsMonitored: ASSISTANTS,
    shareOfShelf,
    sourceInfluence,
    accuracyMetrics,
    ethicsSummary,
    siteAudit,
    recommendations,
  });

  const completedOutput: AnalysisOutput = {
    ...outputBase,
    briefCoverage: finalBriefCoverage,
    executiveSummary: buildExecutiveSummary({
      shareOfShelf,
      averageRank,
      sourceInfluence,
      accuracyMetrics,
      ethicsSummary,
      briefCoverage: finalBriefCoverage,
    }),
    recommendations,
  };

  return completedOutput;
}
