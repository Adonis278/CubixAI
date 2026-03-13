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
import { MONITORING_CONNECTORS, MULTI_ASSISTANT_RESOURCES } from "@/services/monitoring-strategy";
import { AnalysisGoal, NewAnalysisInput } from "@/types/analysis";

const GOALS: AnalysisGoal[] = [
  "increase AI share of shelf",
  "improve local ranking",
  "reduce factual errors",
];

export function NewAnalysisForm() {
  const router = useRouter();
  const { user } = useAuth();

  const [productName, setProductName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [productPageUrl, setProductPageUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [location, setLocation] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [competitorBrands, setCompetitorBrands] = useState("");
  const [authoritativeFacts, setAuthoritativeFacts] = useState("");
  const [goal, setGoal] = useState<AnalysisGoal>("increase AI share of shelf");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () =>
      productName.trim() &&
      companyName.trim() &&
      companyWebsite.trim() &&
      targetAudience.trim() &&
      location.trim() &&
      productCategory.trim() &&
      competitorBrands.trim() &&
      authoritativeFacts.trim().length >= 20,
    [authoritativeFacts, companyName, companyWebsite, competitorBrands, location, productCategory, productName, targetAudience],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("You must be signed in.");
      return;
    }

    let parsedCompanyWebsite: URL;
    let parsedProductPageUrl: URL | undefined;

    try {
      parsedCompanyWebsite = new URL(companyWebsite.trim());
    } catch {
      setError("Please enter a valid company website URL.");
      return;
    }

    if (productPageUrl.trim()) {
      try {
        parsedProductPageUrl = new URL(productPageUrl.trim());
      } catch {
        setError("Please enter a valid product page URL or leave it empty.");
        return;
      }
    }

    try {
      setLoading(true);

      const payload: NewAnalysisInput = {
        productName: productName.trim(),
        companyName: companyName.trim(),
        companyWebsite: parsedCompanyWebsite.toString(),
        productPageUrl: parsedProductPageUrl?.toString(),
        targetAudience: targetAudience.trim(),
        location: location.trim(),
        productCategory: productCategory.trim(),
        competitorBrands: competitorBrands
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        authoritativeFacts: authoritativeFacts.trim(),
        goal,
      };

      if (payload.competitorBrands.length === 0) {
        setError("Please enter at least one competitor brand.");
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
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Unable to run the monitoring analysis right now."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden border-orange-100">
        <div className="border-b border-orange-100 bg-[linear-gradient(135deg,_#fff4e8_0%,_#ffffff_65%)] px-6 py-6 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">New Monitoring Run</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Measure how your product shows up in assistant shopping answers</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This run generates 21 shopping-style queries across ChatGPT, Gemini, and Alexa-style monitoring surfaces, then scores visibility, source quality, and factual accuracy.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-6 py-6 md:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Product Name
              <Input
                placeholder="Alarm Clock"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Company Name
              <Input
                placeholder="Nike"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Company Website
              <Input
                type="url"
                placeholder="https://example.com"
                value={companyWebsite}
                onChange={(event) => setCompanyWebsite(event.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Product Page URL
              <Input
                type="url"
                placeholder="https://example.com/products/alarm-clock"
                value={productPageUrl}
                onChange={(event) => setProductPageUrl(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Product Category
              <Input
                placeholder="alarm clocks"
                value={productCategory}
                onChange={(event) => setProductCategory(event.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Target Audience
              <Input
                placeholder="college students, busy parents, travelers"
                value={targetAudience}
                onChange={(event) => setTargetAudience(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Location
              <Input
                placeholder="Austin, TX"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Competitor Brands
              <Input
                placeholder="Sony, Bose, Philips"
                value={competitorBrands}
                onChange={(event) => setCompetitorBrands(event.target.value)}
                required
              />
            </label>
          </div>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            Authoritative Product Facts
            <TextArea
              rows={6}
              placeholder="Add the facts you trust: pricing, features, availability, shipping, returns, certifications, location coverage, differentiators, and the exact product description."
              value={authoritativeFacts}
              onChange={(event) => setAuthoritativeFacts(event.target.value)}
              required
            />
            <p className="text-xs text-slate-500">This is the truth set used for accuracy checks and hallucination flags.</p>
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            Primary Goal
            <select
              value={goal}
              onChange={(event) => setGoal(event.target.value as AnalysisGoal)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              {GOALS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button disabled={!canSubmit || loading} className="min-w-[180px]">
              {loading ? "Monitoring AI Answers..." : "Run Monitoring Analysis"}
            </Button>
            <p className="text-xs text-slate-500">The app stores query results, sources, share-of-shelf, and flagged claims in Firestore.</p>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <Card className="border-slate-200 bg-slate-950 p-6 text-slate-100">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">What Gets Measured</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>AI share of shelf across assistant-style shopping queries.</li>
            <li>Estimated ranking position for the product or brand in each answer.</li>
            <li>Source influence, including official vs competitor vs generic domains.</li>
            <li>Claim verification against the authoritative product facts you provide.</li>
          </ul>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Connector Reality Check</p>
          <div className="mt-4 space-y-3">
            {MONITORING_CONNECTORS.map((connector) => (
              <div key={connector.platform} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{connector.platform}</p>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {connector.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{connector.note}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Example Queries</p>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">best 3 alarm clocks for college students in Austin, TX</p>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">cheapest alarm clocks in Austin, TX</p>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">Nike alarm clock near Austin, TX</p>
          </div>
        </Card>

        <Card className="border-orange-100 bg-orange-50 p-6">
          <p className="text-sm font-semibold text-slate-900">Ethics and trust are first-class outputs.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Every run keeps only HTTPS citations, highlights unsupported claims, and produces a human-review signal when the model says something the provided product truth cannot support.
          </p>
          <div className="mt-4 space-y-2">
            {MULTI_ASSISTANT_RESOURCES.slice(0, 3).map((resource) => (
              <p key={resource.title} className="text-xs leading-5 text-slate-600">
                <span className="font-semibold text-slate-800">{resource.title}:</span> {resource.description}
              </p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
