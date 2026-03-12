export type AnalysisGoal =
  | "show up in AI searches"
  | "drive traffic to website"
  | "increase purchases";

export interface NewAnalysisInput {
  companyName: string;
  websiteUrl: string;
  category: string;
  competitors: string[];
  businessDescription?: string;
  goal?: AnalysisGoal;
}

export interface QueryResult {
  prompt: string;
  mentioned: boolean;
  estimatedRank: number | null;
  competitorsMentioned: string[];
  explanation: string;
}

export interface AuditCheck {
  label: string;
  status: "pass" | "warning" | "missing";
  note: string;
}

export interface SiteAudit {
  score: number;
  checks: AuditCheck[];
  issues: string[];
  suggestions: string[];
}

export interface AnalysisOutput {
  promptsAnalyzed: number;
  visibilityScore: number;
  mentionRate: number;
  averageRank: number | null;
  competitorMentionFrequency: Record<string, number>;
  fairnessInsight: string;
  siteAudit: SiteAudit;
  results: QueryResult[];
  recommendations: string[];
}

export interface AnalysisRecord extends AnalysisOutput {
  id?: string;
  userId: string;
  companyName: string;
  websiteUrl: string;
  category: string;
  competitors: string[];
  businessDescription?: string;
  goal?: AnalysisGoal;
  createdAt: string;
}
