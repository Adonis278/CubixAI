"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils";
import { getAnalysisHistory } from "@/services/firestore";
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
      } catch (error) {
        if (!cancelled) {
          setError(getErrorMessage(error, "Unable to load your analyses right now."));
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
    const avgScore = total ? Math.round(history.reduce((sum, row) => sum + row.visibilityScore, 0) / total) : 0;
    const avgMentionRate = total ? Math.round(history.reduce((sum, row) => sum + row.mentionRate, 0) / total) : 0;

    return {
      total,
      avgScore,
      avgMentionRate,
    };
  }, [history]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-orange-100 bg-[linear-gradient(120deg,_#fff7ed_0%,_#ffffff_60%)] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-500">Welcome</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Measure how your brand appears in AI shopping answers</h1>
        <p className="mt-1 text-sm text-slate-600">Track mention rate, ranking position, and competitor share in one dashboard.</p>
        <Link href="/analysis/new" className="mt-4 inline-block">
          <Button>Run New Analysis</Button>
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Analyses</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{quickStats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Latest Score</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{latest?.visibilityScore ?? "-"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Average Score</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{quickStats.avgScore}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Avg Mention Rate</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{quickStats.avgMentionRate}%</p>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-900">Recent Analyses</h2>
          <Link href="/history">
            <Button variant="secondary">View All</Button>
          </Link>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-slate-600">Loading dashboard data...</p>
        ) : error ? (
          <p className="p-4 text-sm text-rose-600">{error}</p>
        ) : history.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-slate-600">No analyses yet. Start your first visibility run.</p>
            <Link href="/analysis/new" className="mt-3 inline-block">
              <Button>Run First Analysis</Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.slice(0, 5).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-800">{item.companyName}</p>
                  <p className="text-xs text-slate-500">{item.category}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold text-orange-600">Score {item.visibilityScore}</p>
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
