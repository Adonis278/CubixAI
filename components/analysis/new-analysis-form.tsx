"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, TextArea } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/utils";
import { requestAnalysis } from "@/services/analysis-api";
import { createAnalysisRecord } from "@/services/firestore";
import { AnalysisGoal, NewAnalysisInput } from "@/types/analysis";

const GOALS: AnalysisGoal[] = [
  "show up in AI searches",
  "drive traffic to website",
  "increase purchases",
];

export function NewAnalysisForm() {
  const router = useRouter();
  const { user } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [category, setCategory] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [goal, setGoal] = useState<AnalysisGoal>("show up in AI searches");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => companyName.trim() && websiteUrl.trim() && category.trim() && competitors.trim(),
    [companyName, websiteUrl, category, competitors],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("You must be signed in.");
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(websiteUrl.trim());
    } catch {
      setError("Please enter a valid URL.");
      return;
    }

    try {
      setLoading(true);
      const payload: NewAnalysisInput = {
        companyName: companyName.trim(),
        websiteUrl: parsedUrl.toString(),
        category: category.trim(),
        competitors: competitors
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        businessDescription: businessDescription.trim() || undefined,
        goal,
      };

      if (payload.competitors.length === 0) {
        setError("Please enter at least one competitor.");
        return;
      }

      const analysis = await requestAnalysis(payload);
      const analysisId = await createAnalysisRecord({
        ...payload,
        ...analysis,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });

      router.push(`/analysis/${analysisId}`);
    } catch (error) {
      setError(getErrorMessage(error, "Unable to run the analysis right now."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Run New AI Visibility Analysis</h2>
        <p className="text-sm text-slate-600">Submit your brand profile and we will generate an actionable visibility report.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Company Name
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Website URL
            <Input
              type="url"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Product Category
            <Input value={category} onChange={(e) => setCategory(e.target.value)} required />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Competitors (comma-separated)
            <Input value={competitors} onChange={(e) => setCompetitors(e.target.value)} required />
          </label>
        </div>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Business Description (optional)
          <TextArea rows={3} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} />
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Priority Goal
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as AnalysisGoal)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            {GOALS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

        <div className="pt-2">
          <Button disabled={!canSubmit || loading} className="w-full md:w-auto">
            {loading ? "Running Analysis..." : "Run Analysis"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
