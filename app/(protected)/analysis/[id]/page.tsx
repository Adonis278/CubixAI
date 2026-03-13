"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { ResultsView } from "@/components/analysis/results-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, getErrorMessage } from "@/lib/utils";
import { getAnalysesByIds, getAnalysisById } from "@/services/firestore";
import { AnalysisRecord } from "@/types/analysis";

export default function AnalysisDetailsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [selectedId, setSelectedId] = useState(params.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const batchIds = useMemo(() => {
    const rawBatchIds = searchParams.get("batch");
    const parsedIds = rawBatchIds
      ? rawBatchIds
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    return Array.from(new Set([params.id, ...parsedIds]));
  }, [params.id, searchParams]);

  const failedCount = Number(searchParams.get("failed") ?? "0") || 0;
  const activeAnalysis = analyses.find((item) => item.id === selectedId) ?? analyses[0] ?? null;

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
        let records: AnalysisRecord[] = [];

        if (batchIds.length > 1) {
          records = await getAnalysesByIds(batchIds);
        } else {
          const record = await getAnalysisById(params.id);
          records = record ? [record] : [];
        }

        if (!cancelled) {
          const sortedRecords = records
            .slice()
            .sort((left, right) => batchIds.indexOf(left.id ?? "") - batchIds.indexOf(right.id ?? ""));
          setAnalyses(sortedRecords);
          setSelectedId((currentId) => (sortedRecords.some((item) => item.id === currentId) ? currentId : sortedRecords[0]?.id ?? params.id));
        }
      } catch (error) {
        if (!cancelled) {
          setError(getErrorMessage(error, "Unable to load this analysis right now."));
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
  }, [batchIds, params.id, user]);

  useEffect(() => {
    setSelectedId(params.id);
  }, [params.id]);

  if (loading) {
    return <div className="section-panel p-6">Loading analysis...</div>;
  }

  if (error) {
    return (
      <div className="section-panel p-6">
        <p className="text-rose-600">{error}</p>
        <Link href="/history" className="mt-3 inline-block">
          <Button variant="secondary">Go to History</Button>
        </Link>
      </div>
    );
  }

  if (!activeAnalysis) {
    return (
      <div className="section-panel p-6">
        <p className="text-slate-700">Analysis not found.</p>
        <Link href="/history" className="mt-3 inline-block">
          <Button variant="secondary">Go to History</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {analyses.length > 1 ? (
        <section className="section-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Batch Monitoring Workspace</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-950">Switch between batch analyses without leaving the results page.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                Each box below represents one saved analysis from your CSV run. Click any one to bring its full analytics report into view.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">{analyses.length} analyses loaded</Badge>
              {failedCount > 0 ? <Badge tone="warning">{failedCount} failed rows omitted</Badge> : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {analyses.map((item) => {
              const active = item.id === activeAnalysis.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.id && setSelectedId(item.id)}
                  className={cn(
                    "rounded-[24px] border px-4 py-4 text-left transition",
                    active
                      ? "border-orange-300 bg-[linear-gradient(145deg,_rgba(255,244,232,0.96)_0%,_rgba(255,255,255,0.92)_100%)] shadow-[0_18px_32px_rgba(239,125,50,0.14)]"
                      : "border-slate-200 bg-white/72 hover:border-orange-200 hover:bg-orange-50/40",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Analysis</p>
                    <Badge tone={active ? "warning" : "neutral"}>{active ? "active" : "open"}</Badge>
                  </div>
                  <p className="mt-3 text-lg font-bold text-slate-950">{item.productName}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.companyName} / {item.location}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Share</p>
                      <p className="mt-2 text-lg font-bold text-slate-950">{item.shareOfShelf}%</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Accuracy</p>
                      <p className="mt-2 text-lg font-bold text-slate-950">{item.accuracyMetrics.accuracyRate}%</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="section-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Monitoring Results</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-950">{activeAnalysis.productName} AI Commerce Report</h1>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {activeAnalysis.companyName} / {activeAnalysis.productCategory} / {activeAnalysis.location}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={activeAnalysis.shareOfShelf >= 50 ? "success" : activeAnalysis.shareOfShelf >= 30 ? "warning" : "danger"}>
              {activeAnalysis.shareOfShelf}% share of shelf
            </Badge>
            <Badge
              tone={
                activeAnalysis.ethicsSummary.status === "healthy"
                  ? "success"
                  : activeAnalysis.ethicsSummary.status === "review"
                    ? "warning"
                    : "danger"
              }
            >
              {activeAnalysis.ethicsSummary.status}
            </Badge>
            <Badge tone="neutral">{activeAnalysis.queriesAnalyzed} monitored queries</Badge>
          </div>
        </div>
      </section>
      <ResultsView analysis={activeAnalysis} />
    </div>
  );
}
