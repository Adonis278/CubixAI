"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils";
import { getAnalysisHistory } from "@/services/firestore";
import { AnalysisRecord } from "@/types/analysis";

export default function HistoryPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalysisRecord[]>([]);
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
        const records = await getAnalysisHistory(user.uid);
        if (!cancelled) {
          setData(records);
        }
      } catch (error) {
        if (!cancelled) {
          setError(getErrorMessage(error, "Unable to load your analysis history right now."));
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analysis History</h1>
        <p className="text-sm text-slate-600">Review all saved analyses for your account.</p>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-slate-600">Loading analysis history...</p>
        ) : error ? (
          <p className="p-5 text-sm text-rose-600">{error}</p>
        ) : data.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-slate-600">No analyses yet. Run your first one.</p>
            <Link href="/analysis/new" className="mt-3 inline-block">
              <Button>Start New Analysis</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.companyName}</td>
                  <td className="px-4 py-3 text-slate-700">{item.category}</td>
                  <td className="px-4 py-3 text-orange-600">{item.visibilityScore}</td>
                  <td className="px-4 py-3 text-slate-600">{format(new Date(item.createdAt), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3">
                    <Link href={`/analysis/${item.id}`}>
                      <Button variant="secondary">Open Results</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
