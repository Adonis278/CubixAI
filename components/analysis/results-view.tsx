"use client";

import { AnalysisRecord, QueryTheme, SourceType } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MONITORING_CONNECTORS, MULTI_ASSISTANT_RESOURCES } from "@/services/monitoring-strategy";

const THEME_LABELS: Record<QueryTheme, string> = {
  best_of: "Best Of",
  budget: "Budget",
  simple: "Simple",
  local: "Local",
  audience_fit: "Audience Fit",
  trusted: "Trusted",
  comparison: "Comparison",
};

const SOURCE_LABELS: Record<SourceType, string> = {
  official: "Official",
  competitor: "Competitor",
  marketplace: "Marketplace",
  review: "Review",
  editorial: "Editorial",
  directory: "Directory",
  unknown: "Unknown",
};

function toneForPosition(position: AnalysisRecord["results"][number]["productPosition"]) {
  if (position === "top_3") return "success" as const;
  if (position === "mentioned") return "warning" as const;
  return "danger" as const;
}

function toneForTrust(trust: AnalysisRecord["results"][number]["sourceTrust"]) {
  if (trust === "strong") return "success" as const;
  if (trust === "mixed") return "warning" as const;
  return "danger" as const;
}

function toneForEthics(status: AnalysisRecord["ethicsSummary"]["status"]) {
  if (status === "healthy") return "success" as const;
  if (status === "review") return "warning" as const;
  return "danger" as const;
}

function toneForSource(type: SourceType, isOfficial: boolean) {
  if (isOfficial) return "success" as const;
  if (type === "competitor") return "danger" as const;
  if (type === "review" || type === "marketplace") return "warning" as const;
  return "neutral" as const;
}

function toneForSeverity(severity: AnalysisRecord["accuracyFindings"][number]["severity"]) {
  if (severity === "high") return "danger" as const;
  if (severity === "medium") return "warning" as const;
  return "neutral" as const;
}

export function ResultsView({ analysis }: { analysis: AnalysisRecord }) {
  const flaggedFindings = analysis.accuracyFindings.filter((finding) => finding.status !== "verified");
  const groundedResults = analysis.results.filter((result) => result.citations.length > 0).length;
  const leadingAssistant =
    analysis.assistantCoverage
      .slice()
      .sort((left, right) => right.shareOfShelf - left.shareOfShelf || (left.averageRank ?? 99) - (right.averageRank ?? 99))[0] ?? null;
  const themeCoverage = Object.entries(
    analysis.results.reduce<Record<string, { total: number; mentioned: number }>>((accumulator, result) => {
      accumulator[result.theme] ??= { total: 0, mentioned: 0 };
      accumulator[result.theme].total += 1;
      if (result.mentioned) {
        accumulator[result.theme].mentioned += 1;
      }
      return accumulator;
    }, {}),
  )
    .map(([theme, stats]) => ({
      theme: theme as QueryTheme,
      rate: stats.total ? Math.round((stats.mentioned / stats.total) * 100) : 0,
    }))
    .sort((left, right) => right.rate - left.rate);
  const strongestTheme = themeCoverage[0];
  const weakestTheme = themeCoverage[themeCoverage.length - 1];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
        <div className="metric-card">
          <p className="metric-label">AI Share of Shelf</p>
          <p className="metric-value text-orange-600">{analysis.shareOfShelf}%</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Visibility Score</p>
          <p className="metric-value">{analysis.visibilityScore}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Average Rank</p>
          <p className="metric-value">{analysis.averageRank ?? "-"}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Queries Monitored</p>
          <p className="metric-value">{analysis.queriesAnalyzed}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Official Source Share</p>
          <p className="metric-value">{analysis.sourceInfluence.officialSourceShare}%</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Accuracy Rate</p>
          <p className="metric-value">{analysis.accuracyMetrics.accuracyRate}%</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Evidence Coverage</p>
          <p className="metric-value">{analysis.accuracyMetrics.evidenceCoverageRate}%</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Brief Coverage</p>
          <p className="metric-value">{analysis.briefCoverage.score}%</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-orange-100/70 bg-[linear-gradient(135deg,_rgba(255,244,232,0.96)_0%,_rgba(255,255,255,0.82)_72%)] px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">OpenAI research engine</Badge>
              <Badge tone="neutral">{analysis.monitoringMode}</Badge>
            </div>
            <h3 className="mt-3 text-xl font-bold text-slate-900">Executive Summary</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{analysis.executiveSummary}</p>
          </div>
          <div className="grid gap-4 px-5 py-5 md:grid-cols-3">
            <div className="metric-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Assistants Monitored</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{analysis.assistantsMonitored.join(", ")}</p>
            </div>
            <div className="metric-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Secure Source Rate</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{analysis.sourceInfluence.secureHttpsRate}% HTTPS</p>
            </div>
            <div className="metric-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Human Review Queue</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{analysis.ethicsSummary.flaggedClaimCount} flagged claims</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Ethics & Trust</h3>
            <Badge tone={toneForEthics(analysis.ethicsSummary.status)}>{analysis.ethicsSummary.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-600">{analysis.ethicsSummary.note}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="metric-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Hallucination Risk</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{analysis.ethicsSummary.hallucinationRisk}</p>
            </div>
            <div className="metric-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Claim Validation</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {analysis.accuracyMetrics.claimValidationRate}% ({analysis.accuracyMetrics.verifiedClaims}/{analysis.accuracyMetrics.totalClaims || 0})
              </p>
            </div>
            <div className="metric-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Queries With Evidence</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {analysis.accuracyMetrics.groundedQueries}/{analysis.queriesAnalyzed}
              </p>
            </div>
            <div className="metric-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Queries Without Evidence</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{analysis.accuracyMetrics.zeroEvidenceQueries}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">Brief Coverage Checklist</h3>
            <Badge tone={analysis.briefCoverage.score >= 85 ? "success" : analysis.briefCoverage.score >= 60 ? "warning" : "danger"}>
              {analysis.briefCoverage.score}% complete
            </Badge>
          </div>
          <ul className="mt-4 space-y-3">
            {analysis.briefCoverage.items.map((item) => (
              <li key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <Badge tone={item.status === "answered" ? "success" : item.status === "partial" ? "warning" : "danger"}>
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.note}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">Trend Signals</h3>
            <Badge tone="neutral">{groundedResults} grounded queries</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Strongest Theme</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{strongestTheme ? THEME_LABELS[strongestTheme.theme] : "-"}</p>
              <p className="mt-1 text-sm text-slate-500">{strongestTheme ? `${strongestTheme.rate}% mention rate` : "No query trend yet."}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Weakest Theme</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{weakestTheme ? THEME_LABELS[weakestTheme.theme] : "-"}</p>
              <p className="mt-1 text-sm text-slate-500">{weakestTheme ? `${weakestTheme.rate}% mention rate` : "No query trend yet."}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Leading Assistant</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{leadingAssistant?.assistant ?? "-"}</p>
              <p className="mt-1 text-sm text-slate-500">
                {leadingAssistant ? `${leadingAssistant.shareOfShelf}% share of shelf in this run` : "No assistant result yet."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Biggest Risk</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {analysis.accuracyMetrics.zeroEvidenceQueries > 0 ? "Evidence gap" : analysis.ethicsSummary.status}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {analysis.accuracyMetrics.zeroEvidenceQueries > 0
                  ? `${analysis.accuracyMetrics.zeroEvidenceQueries} queries returned no retained evidence.`
                  : analysis.ethicsSummary.note}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">Platform Readiness</h3>
            <Badge tone="warning">Direct multi-platform capture is not live yet</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {MONITORING_CONNECTORS.map((connector) => (
              <div key={connector.platform} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{connector.platform}</p>
                  <Badge tone={connector.status === "modeled" ? "warning" : "neutral"}>{connector.status}</Badge>
                  <Badge tone="neutral">{connector.method}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{connector.note}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">Resources Needed For Direct Connectors</h3>
            <Badge tone="neutral">Launch checklist</Badge>
          </div>
          <ul className="mt-4 space-y-3">
            {MULTI_ASSISTANT_RESOURCES.map((resource) => (
              <li key={resource.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">{resource.title}</p>
                <p className="mt-2 text-sm text-slate-600">{resource.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">Assistant Coverage</h3>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Share of shelf by monitoring surface</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {analysis.assistantCoverage.map((coverage) => (
            <div key={coverage.assistant} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900">{coverage.assistant}</p>
                <Badge tone={coverage.shareOfShelf >= 50 ? "success" : coverage.shareOfShelf >= 30 ? "warning" : "danger"}>
                  {coverage.shareOfShelf}% share
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Queries</p>
                  <p className="mt-1 font-semibold text-slate-900">{coverage.queriesRun}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Appearances</p>
                  <p className="mt-1 font-semibold text-slate-900">{coverage.appearances}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Average Rank</p>
                  <p className="mt-1 font-semibold text-slate-900">{coverage.averageRank ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Flagged Claims</p>
                  <p className="mt-1 font-semibold text-slate-900">{coverage.flaggedClaims}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Grounded Coverage</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {coverage.queriesRun ? Math.round((analysis.results.filter((result) => result.assistant === coverage.assistant && result.citations.length > 0).length / coverage.queriesRun) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-5">
          <h3 className="text-lg font-bold text-slate-900">Source & Influence Analysis</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Official Sources</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{analysis.sourceInfluence.officialSourceShare}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Competitor Influence</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{analysis.sourceInfluence.competitorSourceShare}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">HTTPS Sources</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{analysis.sourceInfluence.secureHttpsRate}%</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(Object.entries(analysis.sourceInfluence.sourceTypeBreakdown) as Array<[SourceType, number]>).map(([type, count]) => (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>{SOURCE_LABELS[type]}</span>
                  <span>{count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-orange-500"
                    style={{
                      width: `${analysis.sourcesReviewed.length ? Math.round((count / analysis.sourcesReviewed.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Dominant Domains</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.sourceInfluence.dominantDomains.map((domain) => (
                <Badge key={domain.domain} tone={domain.trustLevel === "high" ? "success" : domain.trustLevel === "medium" ? "warning" : "neutral"}>
                  {domain.domain} x{domain.count}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-bold text-slate-900">Site Readiness Audit</h3>
          <p className="mt-2 text-sm text-slate-600">Audited URL: {analysis.siteAudit.auditedUrl}</p>
          <div className="mt-4 grid gap-3">
            {analysis.siteAudit.checks.map((check) => (
              <div key={check.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                  <Badge tone={check.status === "pass" ? "success" : check.status === "warning" ? "warning" : "danger"}>
                    {check.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{check.note}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="p-5">
        <h3 className="text-lg font-bold text-slate-900">Recommendations</h3>
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {analysis.recommendations.map((recommendation) => (
            <li key={recommendation} className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4 text-sm leading-6 text-slate-700">
              {recommendation}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">Secure Source Library</h3>
          <Badge tone="neutral">HTTPS only</Badge>
        </div>
        {analysis.sourcesReviewed.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No secure grounded citations were retained for this run.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {analysis.sourcesReviewed.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-orange-300 hover:bg-orange-50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={toneForSource(source.sourceType, source.isOfficial)}>{SOURCE_LABELS[source.sourceType]}</Badge>
                  <Badge tone={source.trustLevel === "high" ? "success" : source.trustLevel === "medium" ? "warning" : "neutral"}>
                    {source.trustLevel} trust
                  </Badge>
                  {source.secure ? <Badge tone="success">https</Badge> : null}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{source.title}</p>
                <p className="mt-1 text-xs text-slate-500">{source.domain}</p>
              </a>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">Accuracy & Human Review Queue</h3>
          <Badge tone={flaggedFindings.length > 0 ? "warning" : "success"}>
            {flaggedFindings.length > 0 ? `${flaggedFindings.length} items need review` : "No review backlog"}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Evidence Coverage</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{analysis.accuracyMetrics.evidenceCoverageRate}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fact-Check Coverage</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{analysis.accuracyMetrics.factCheckCoverageRate}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Queries With Claims</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{analysis.accuracyMetrics.queriesWithClaims}</p>
          </div>
        </div>
        {analysis.accuracyFindings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            No structured claims were extracted from this run. Treat the accuracy score as low-confidence until more fact-checkable claims are observed.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {analysis.accuracyFindings.map((finding) => (
              <li key={`${finding.assistant}-${finding.query}-${finding.claimType}-${finding.claimValue}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={finding.status === "verified" ? "success" : finding.status === "warning" ? "warning" : "neutral"}>
                    {finding.status}
                  </Badge>
                  <Badge tone={toneForSeverity(finding.severity)}>{finding.severity}</Badge>
                  <p className="text-sm font-semibold text-slate-900">{finding.claimValue}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{finding.note}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                  {finding.assistant} / {finding.claimType}
                </p>
                <p className="mt-1 text-xs text-slate-500">Query: {finding.query}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">Query Monitoring Matrix</h3>
        </div>
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Assistant</th>
                <th className="px-4 py-3">Theme</th>
                <th className="px-4 py-3">Query</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Source Trust</th>
                <th className="px-4 py-3">Observed Description & Evidence</th>
              </tr>
            </thead>
            <tbody>
              {analysis.results.map((row) => (
                <tr key={`${row.assistant}-${row.query}`} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.assistant}</td>
                  <td className="px-4 py-3 text-slate-700">{THEME_LABELS[row.theme]}</td>
                  <td className="px-4 py-3 text-slate-700">{row.query}</td>
                  <td className="px-4 py-3">
                    <Badge tone={toneForPosition(row.productPosition)}>{row.productPosition.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.estimatedRank ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={toneForTrust(row.sourceTrust)}>{row.sourceTrust}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p className="font-medium text-slate-900">{row.observedDescription}</p>
                    <p className="mt-1">{row.assistantSummary}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{row.explanation}</p>
                    {row.competitorsMentioned.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.competitorsMentioned.map((competitor) => (
                          <Badge key={`${row.query}-${competitor}`} tone="neutral">
                            {competitor}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {row.citations.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.citations.map((citation) => (
                          <a
                            key={`${row.query}-${citation.url}`}
                            href={citation.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-orange-700 hover:text-orange-800"
                          >
                            {citation.title}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
