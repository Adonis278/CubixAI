import { clamp } from "@/lib/utils";
import {
  AnalysisOutput,
  NewAnalysisInput,
  QueryResult,
  SiteAudit,
} from "@/types/analysis";

const CATEGORY_PROMPT_LIBRARY: Record<string, string[]> = {
  software: [
    "best project management software for small teams",
    "best CRM for startups",
    "best accounting tool for freelancers",
  ],
  electronics: [
    "best wireless earbuds under $200",
    "best laptops for students",
    "best 4k monitor for designers",
  ],
  skincare: [
    "top skincare brands for acne",
    "best sunscreen for sensitive skin",
    "best retinol alternatives for beginners",
  ],
  fashion: [
    "best sustainable clothing brands",
    "best running shoes for daily training",
    "top minimalist workwear brands",
  ],
};

const GENERIC_PROMPTS = [
  "best value option in this category",
  "top rated products with strong customer reviews",
  "which brand has the best return policy",
  "most trusted brand for first-time buyers",
  "best option for small businesses",
  "which product has the clearest feature comparison",
  "best option for fast shipping",
  "top picks recommended by experts",
  "best premium option for advanced users",
  "best entry-level option for beginners",
  "most reliable brand with long warranty",
  "best option for long-term value",
  "which brand has the strongest social proof",
  "best product for budget-conscious buyers",
  "best product for conversion-focused landing pages",
];

function hashSeed(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function deterministicFloat(seed: number, index: number) {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function normalizeCategory(category: string) {
  const lowered = category.toLowerCase();
  if (lowered.includes("software") || lowered.includes("saas")) return "software";
  if (lowered.includes("earbud") || lowered.includes("laptop") || lowered.includes("tech")) {
    return "electronics";
  }
  if (lowered.includes("skin") || lowered.includes("beauty") || lowered.includes("cosmetic")) {
    return "skincare";
  }
  if (lowered.includes("fashion") || lowered.includes("clothing") || lowered.includes("shoe")) {
    return "fashion";
  }
  return "generic";
}

function buildPrompts(category: string) {
  const normalized = normalizeCategory(category);
  const categoryPrompts = CATEGORY_PROMPT_LIBRARY[normalized] ?? [];
  return [...categoryPrompts, ...GENERIC_PROMPTS].slice(0, 12);
}

async function runWebsiteAudit(input: NewAnalysisInput): Promise<SiteAudit> {
  const checks: SiteAudit["checks"] = [];
  const issues: string[] = [];
  const suggestions: string[] = [];

  let html = "";
  try {
    const response = await fetch(input.websiteUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": "CubixAI-MVP-Audit/1.0",
      },
    });
    html = response.ok ? await response.text() : "";
  } catch {
    html = "";
  }

  const text = html.toLowerCase();
  const categoryTerm = input.category.toLowerCase();

  const hasTitle = /<title>[\s\S]*?<\/title>/.test(text);
  const hasMetaDescription = /<meta[^>]*name=["']description["'][^>]*>/.test(text);
  const hasFaq = text.includes("faq") || text.includes("frequently asked");
  const hasStructuredData =
    text.includes("application/ld+json") || text.includes("itemtype=") || text.includes("schema.org");
  const hasCategoryRelevance = text.includes(categoryTerm.split(" ")[0] ?? "");
  const hasTrustSignals =
    text.includes("reviews") || text.includes("shipping") || text.includes("returns") || text.includes("warranty");
  const hasFeatureClarity =
    text.includes("features") || text.includes("benefits") || text.includes("compare") || text.includes("pricing");

  const flags = [
    { label: "Page title", ok: hasTitle, warningNote: "Title is missing or inaccessible" },
    {
      label: "Meta description",
      ok: hasMetaDescription,
      warningNote: "Add a clear meta description for better retrieval snippets",
    },
    { label: "FAQ-style content", ok: hasFaq, warningNote: "FAQ content can improve answerability" },
    {
      label: "Structured data",
      ok: hasStructuredData,
      warningNote: "Add product/organization schema markup",
    },
    {
      label: "Category relevance",
      ok: hasCategoryRelevance,
      warningNote: "Category keywords are weakly represented",
    },
    {
      label: "Feature clarity",
      ok: hasFeatureClarity,
      warningNote: "Clarify features and value props on key pages",
    },
    {
      label: "Trust signals",
      ok: hasTrustSignals,
      warningNote: "Add stronger trust indicators (reviews, returns, warranty)",
    },
  ];

  for (const flag of flags) {
    if (flag.ok) {
      checks.push({ label: flag.label, status: "pass", note: "Detected" });
    } else if (html) {
      checks.push({ label: flag.label, status: "warning", note: flag.warningNote });
      issues.push(`${flag.label} is currently weak.`);
      suggestions.push(flag.warningNote);
    } else {
      checks.push({ label: flag.label, status: "missing", note: "Could not reliably inspect website" });
      issues.push(`${flag.label} could not be verified due to crawl limitations.`);
    }
  }

  const passCount = checks.filter((c) => c.status === "pass").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;
  const missingCount = checks.filter((c) => c.status === "missing").length;
  const score = clamp(Math.round((passCount * 14 + warningCount * 8 + missingCount * 3) / 1), 0, 100);

  return {
    score,
    checks,
    issues,
    suggestions: Array.from(new Set(suggestions)).slice(0, 6),
  };
}

function buildRecommendations(input: NewAnalysisInput, output: AnalysisOutput) {
  const recs = new Set<string>();

  if (output.mentionRate < 45) {
    recs.add("Create category-specific FAQ blocks aligned to high-intent shopping questions.");
    recs.add("Publish comparison pages that position your brand against key competitors.");
  }
  if ((output.siteAudit.suggestions ?? []).length > 0) {
    output.siteAudit.suggestions.forEach((s) => recs.add(s));
  }
  if (output.averageRank === null || output.averageRank > 4) {
    recs.add("Strengthen product copy with clearer pricing, features, and use-case language.");
  }
  if (input.goal === "increase purchases") {
    recs.add("Improve conversion trust cues near CTAs: shipping times, return policy, and social proof.");
  }
  recs.add("Add structured product data (JSON-LD) to key landing and product pages.");

  return Array.from(recs).slice(0, 7);
}

export async function runMockAnalysis(input: NewAnalysisInput): Promise<AnalysisOutput> {
  const prompts = buildPrompts(input.category);
  const seed = hashSeed(`${input.companyName}|${input.category}|${input.websiteUrl}`);

  let mentionCount = 0;
  let rankTotal = 0;
  let rankedMentions = 0;

  const competitorMentionFrequency: Record<string, number> = Object.fromEntries(
    input.competitors.map((name) => [name, 0]),
  );

  const results: QueryResult[] = prompts.map((prompt, index) => {
    const mentionRoll = deterministicFloat(seed, index);
    const mentioned = mentionRoll > 0.35;
    const estimatedRank = mentioned ? Math.max(1, Math.floor(deterministicFloat(seed + 99, index) * 8) + 1) : null;

    const competitorsMentioned = input.competitors.filter((_, compIndex) => {
      return deterministicFloat(seed + compIndex * 17, index) > 0.5;
    });

    if (mentioned) {
      mentionCount += 1;
      rankedMentions += 1;
      rankTotal += estimatedRank ?? 0;
    }

    competitorsMentioned.forEach((name) => {
      competitorMentionFrequency[name] = (competitorMentionFrequency[name] ?? 0) + 1;
    });

    let explanation = "High semantic relevance and clear category alignment.";
    if (!mentioned) {
      explanation = "Competitors have denser query-aligned content and stronger trust cues.";
    } else if ((estimatedRank ?? 10) > 5) {
      explanation = "Brand is recognized, but ranking is weakened by thin comparison and FAQ content.";
    }

    return {
      prompt,
      mentioned,
      estimatedRank,
      competitorsMentioned,
      explanation,
    };
  });

  const mentionRate = Math.round((mentionCount / prompts.length) * 100);
  const averageRank = rankedMentions > 0 ? Number((rankTotal / rankedMentions).toFixed(1)) : null;

  const audit = await runWebsiteAudit(input);

  const visibilityScore = clamp(
    Math.round(mentionRate * 0.55 + (averageRank ? (10 - averageRank) * 6 : 8) + audit.score * 0.25),
    0,
    100,
  );

  const fairnessInsight =
    mentionRate < 40
      ? "Your brand appears under-represented in AI-assisted recommendations versus peer brands."
      : "Your brand has moderate representation, but consistency across prompts can improve.";

  const outputBase: AnalysisOutput = {
    promptsAnalyzed: prompts.length,
    visibilityScore,
    mentionRate,
    averageRank,
    competitorMentionFrequency,
    fairnessInsight,
    siteAudit: audit,
    results,
    recommendations: [],
  };

  return {
    ...outputBase,
    recommendations: buildRecommendations(input, outputBase),
  };
}
