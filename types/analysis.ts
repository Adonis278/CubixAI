export type AnalysisGoal =
  | "increase AI share of shelf"
  | "improve local ranking"
  | "reduce factual errors";

export type AssistantName = "ChatGPT" | "Gemini" | "Alexa";

export type QueryTheme =
  | "best_of"
  | "budget"
  | "simple"
  | "local"
  | "audience_fit"
  | "trusted"
  | "comparison";

export interface NewAnalysisInput {
  productName: string;
  companyName: string;
  companyWebsite: string;
  productPageUrl?: string;
  targetAudience: string;
  location: string;
  productCategory: string;
  competitorBrands: string[];
  authoritativeFacts: string;
  goal?: AnalysisGoal;
}

export type ClaimType = "brand" | "price" | "feature" | "availability" | "category" | "trust" | "description" | "other";

export type ClaimConfidence = "low" | "medium" | "high";

export interface ExtractedClaim {
  type: ClaimType;
  value: string;
  confidence: ClaimConfidence;
}

export type SourceType = "official" | "competitor" | "marketplace" | "review" | "editorial" | "directory" | "unknown";
export type SourceTrustLevel = "high" | "medium" | "low";

export interface Citation {
  url: string;
  title: string;
  domain: string;
  sourceType: SourceType;
  trustLevel: SourceTrustLevel;
  isOfficial: boolean;
  isCompetitorSource: boolean;
  secure: boolean;
}

export interface QueryResult {
  assistant: AssistantName;
  theme: QueryTheme;
  query: string;
  mentioned: boolean;
  estimatedRank: number | null;
  productPosition: "top_3" | "mentioned" | "not_visible";
  competitorsMentioned: string[];
  explanation: string;
  assistantSummary: string;
  observedDescription: string;
  claims: ExtractedClaim[];
  citations: Citation[];
  sourceTrust: "strong" | "mixed" | "weak";
}

export interface AccuracyFinding {
  assistant: AssistantName;
  query: string;
  claimType: ClaimType;
  claimValue: string;
  status: "verified" | "warning" | "unverified";
  severity: "low" | "medium" | "high";
  note: string;
  sourceUrl?: string;
}

export interface AssistantCoverage {
  assistant: AssistantName;
  queriesRun: number;
  appearances: number;
  shareOfShelf: number;
  averageRank: number | null;
  flaggedClaims: number;
}

export interface SourceInfluenceMetrics {
  officialSourceShare: number;
  competitorSourceShare: number;
  secureHttpsRate: number;
  sourceTypeBreakdown: Record<SourceType, number>;
  dominantDomains: Array<{
    domain: string;
    count: number;
    trustLevel: SourceTrustLevel;
  }>;
}

export interface AccuracyMetrics {
  totalClaims: number;
  verifiedClaims: number;
  flaggedClaims: number;
  groundedQueries: number;
  zeroEvidenceQueries: number;
  queriesWithClaims: number;
  evidenceCoverageRate: number;
  factCheckCoverageRate: number;
  claimValidationRate: number;
  accuracyRate: number;
  humanReviewRequired: boolean;
}

export interface EthicsSummary {
  status: "healthy" | "review" | "critical";
  hallucinationRisk: "low" | "medium" | "high";
  flaggedClaimCount: number;
  note: string;
}

export interface BriefCoverageItem {
  label: string;
  status: "answered" | "partial" | "missing";
  note: string;
}

export interface BriefCoverage {
  score: number;
  items: BriefCoverageItem[];
}

export interface AuditCheck {
  label: string;
  status: "pass" | "warning" | "missing";
  note: string;
}

export interface SiteAudit {
  auditedUrl: string;
  score: number;
  checks: AuditCheck[];
  issues: string[];
  suggestions: string[];
}

export interface AnalysisOutput {
  analysisProvider: "openai";
  monitoringMode: "assistant-search-monitor";
  assistantsMonitored: AssistantName[];
  queriesAnalyzed: number;
  executiveSummary: string;
  shareOfShelf: number;
  averageRank: number | null;
  visibilityScore: number;
  sourceInfluence: SourceInfluenceMetrics;
  accuracyMetrics: AccuracyMetrics;
  ethicsSummary: EthicsSummary;
  briefCoverage: BriefCoverage;
  assistantCoverage: AssistantCoverage[];
  siteAudit: SiteAudit;
  results: QueryResult[];
  recommendations: string[];
  sourcesReviewed: Citation[];
  accuracyFindings: AccuracyFinding[];
}

export interface AnalysisRecord extends AnalysisOutput {
  id?: string;
  userId: string;
  productName: string;
  companyName: string;
  companyWebsite: string;
  productPageUrl?: string;
  targetAudience: string;
  location: string;
  productCategory: string;
  competitorBrands: string[];
  authoritativeFacts: string;
  goal?: AnalysisGoal;
  createdAt: string;
}
