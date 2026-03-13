"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { ResultsView } from "@/components/analysis/results-view";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils";
import { getAnalysisById } from "@/services/firestore";
import { AnalysisRecord } from "@/types/analysis";

export default function AnalysisDetailsPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
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
        const data = await getAnalysisById(params.id);
        if (!cancelled) {
          setAnalysis(data);
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
  }, [params.id, user]);

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading analysis...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-rose-600">{error}</p>
        <Link href="/history" className="mt-3 inline-block">
          <Button variant="secondary">Go to History</Button>
        </Link>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-700">Analysis not found.</p>
        <Link href="/history" className="mt-3 inline-block">
          <Button variant="secondary">Go to History</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-orange-500">Results</p>
        <h1 className="text-2xl font-bold text-slate-900">{analysis.companyName} Visibility Report</h1>
        <p className="text-sm text-slate-600">Category: {analysis.category}</p>
      </div>
      <ResultsView analysis={analysis} />
    </div>
  );
}
