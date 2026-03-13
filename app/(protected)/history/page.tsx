"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monitoring History</h1>
        <p className="text-sm text-slate-600">Review saved product visibility runs, source quality, and ethics status over time.</p>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-slate-600">Loading monitoring history...</p>
        ) : error ? (
          <p className="p-5 text-sm text-rose-600">{error}</p>
        ) : data.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-slate-600">No monitoring runs yet. Start your first one.</p>
            <Link href="/analysis/new" className="mt-3 inline-block">
              <Button>Start New Analysis</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Share of Shelf</th>
                <th className="px-4 py-3">Accuracy</th>
                <th className="px-4 py-3">Ethics</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{item.productName}</p>
                    <p className="text-xs text-slate-500">{item.companyName}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.location}</td>
                  <td className="px-4 py-3 text-slate-700">{item.shareOfShelf}%</td>
                  <td className="px-4 py-3 text-slate-700">{item.accuracyMetrics.accuracyRate}%</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.ethicsSummary.status === "healthy" ? "success" : item.ethicsSummary.status === "review" ? "warning" : "danger"}>
                      {item.ethicsSummary.status}
                    </Badge>
                  </td>
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
