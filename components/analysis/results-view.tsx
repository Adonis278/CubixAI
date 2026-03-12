"use client";

import { AnalysisRecord } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function statusTone(mentioned: boolean) {
  if (mentioned) return "success" as const;
  return "danger" as const;
}

export function ResultsView({ analysis }: { analysis: AnalysisRecord }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Visibility Score</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{analysis.visibilityScore}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Mention Rate</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{analysis.mentionRate}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Avg Rank</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{analysis.averageRank ?? "-"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Prompts Analyzed</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{analysis.promptsAnalyzed}</p>
        </Card>
      </section>

      <Card className="p-5">
        <h3 className="text-lg font-bold text-slate-900">Fairness & Representation Insight</h3>
        <p className="mt-2 text-sm text-slate-600">{analysis.fairnessInsight}</p>
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-bold text-slate-900">Website Audit ({analysis.siteAudit.score}/100)</h3>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {analysis.siteAudit.checks.map((check) => (
            <div key={check.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{check.label}</p>
                <Badge tone={check.status === "pass" ? "success" : check.status === "warning" ? "warning" : "danger"}>
                  {check.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">{check.note}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-bold text-slate-900">Recommendations</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {analysis.recommendations.map((rec) => (
            <li key={rec} className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
              {rec}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">Query-by-Query Results</h3>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Prompt</th>
                <th className="px-4 py-3">Mentioned</th>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Competitors</th>
                <th className="px-4 py-3">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {analysis.results.map((row) => (
                <tr key={row.prompt} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 text-slate-800">{row.prompt}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(row.mentioned)}>{row.mentioned ? "Mentioned" : "Missed"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.estimatedRank ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.competitorsMentioned.join(", ") || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
