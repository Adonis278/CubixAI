"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/utils";
import { getAnalysisHistory } from "@/services/firestore";
import { MONITORING_CONNECTORS } from "@/services/monitoring-strategy";
import { AnalysisRecord } from "@/types/analysis";

export default function DashboardPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const rows = await getAnalysisHistory(user.uid);
        if (!cancelled) {
          setHistory(rows);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(getErrorMessage(loadError, "Unable to load your monitoring history right now."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const latest = history[0];

  const quickStats = useMemo(() => {
    const total = history.length;

    return {
      total,
      avgShareOfShelf: total ? Math.round(history.reduce((sum, row) => sum + row.shareOfShelf, 0) / total) : 0,
      avgAccuracy: total ? Math.round(history.reduce((sum, row) => sum + row.accuracyMetrics.accuracyRate, 0) / total) : 0,
      avgBriefCoverage: total ? Math.round(history.reduce((sum, row) => sum + row.briefCoverage.score, 0) / total) : 0,
      flaggedClaims: history.reduce((sum, row) => sum + row.ethicsSummary.flaggedClaimCount, 0),
    };
  }, [history]);

  return (
    <div className="space-y-6">
      <section className="section-panel overflow-hidden p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow">Portfolio Snapshot</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-slate-950">Latest signals across your monitored products.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Monitor assistant-style shopping queries, store secure source evidence, flag hallucinations against your product truth, and turn the results into actionable visibility recommendations. Direct Gemini, Claude, and Alexa connectors are still planned, not live.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/analysis/new">
                <Button>Run New Monitoring Analysis</Button>
              </Link>
              <Badge tone="neutral">HTTPS evidence only</Badge>
              <Badge tone="neutral">Ethics review included</Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="metric-card">
              <p className="metric-label">Latest Product</p>
              <p className="metric-value text-[1.55rem]">{latest?.productName ?? "No runs yet"}</p>
              <p className="metric-note">{latest ? `${latest.companyName} / ${latest.location}` : "Start a monitoring run"}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Latest Share of Shelf</p>
              <p className="metric-value text-orange-600">{latest?.shareOfShelf ?? 0}%</p>
              <p className="metric-note">Across assistant shopping queries</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Latest Accuracy Confidence</p>
              <p className="metric-value">{latest?.accuracyMetrics.accuracyRate ?? 0}%</p>
              <p className="metric-note">
                Evidence {latest?.accuracyMetrics.evidenceCoverageRate ?? 0}% / Fact-check {latest?.accuracyMetrics.factCheckCoverageRate ?? 0}%
              </p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Latest Brief Coverage</p>
              <p className="metric-value">{latest?.briefCoverage.score ?? 0}%</p>
              <p className="metric-note">{latest?.ethicsSummary.note ?? "No runs yet."}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="metric-card">
          <p className="metric-label">Monitoring Runs</p>
          <p className="metric-value">{quickStats.total}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Avg Share of Shelf</p>
          <p className="metric-value">{quickStats.avgShareOfShelf}%</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Avg Accuracy Rate</p>
          <p className="metric-value">{quickStats.avgAccuracy}%</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Avg Brief Coverage</p>
          <p className="metric-value">{quickStats.avgBriefCoverage}%</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Flagged Claims</p>
          <p className="metric-value">{quickStats.flaggedClaims}</p>
        </div>
      </section>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Connector Status</h2>
            <p className="text-sm text-slate-500">What is modeled today versus what still needs direct platform integration.</p>
          </div>
          <Badge tone="warning">Current runs are OpenAI-orchestrated</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {MONITORING_CONNECTORS.map((connector) => (
            <div key={connector.platform} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{connector.platform}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={connector.status === "modeled" ? "warning" : "neutral"}>{connector.status}</Badge>
                <Badge tone="neutral">{connector.method}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{connector.note}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Monitoring Runs</h2>
            <p className="text-sm text-slate-500">Stored product-level visibility, source, and ethics snapshots.</p>
          </div>
          <Link href="/history">
            <Button variant="secondary">View All</Button>
          </Link>
        </div>

        {loading ? (
          <p className="p-5 text-sm text-slate-600">Loading dashboard data...</p>
        ) : error ? (
          <p className="p-5 text-sm text-rose-600">{error}</p>
        ) : history.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-slate-600">No monitoring runs yet. Start your first product visibility analysis.</p>
            <Link href="/analysis/new" className="mt-3 inline-block">
              <Button>Run First Analysis</Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.slice(0, 5).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-[220px]">
                  <p className="font-semibold text-slate-900">{item.productName}</p>
                  <p className="text-sm text-slate-600">{item.companyName}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{item.location}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={item.shareOfShelf >= 50 ? "success" : item.shareOfShelf >= 30 ? "warning" : "danger"}>
                    {item.shareOfShelf}% share
                  </Badge>
                  <Badge tone={item.ethicsSummary.status === "healthy" ? "success" : item.ethicsSummary.status === "review" ? "warning" : "danger"}>
                    {item.ethicsSummary.status}
                  </Badge>
                  <Link href={`/analysis/${item.id}`}>
                    <Button variant="secondary">Open</Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
