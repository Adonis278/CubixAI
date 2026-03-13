"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, TextArea } from "@/components/ui/input";
import { parseAnalysisUpload, REQUIRED_UPLOAD_COLUMNS, type ImportedAnalysisRow } from "@/lib/analysis-import";
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

interface BatchRunSuccess {
  id: string;
  productName: string;
  companyName: string;
  location: string;
}

interface BatchRunFailure {
  rowNumber: number;
  productName: string;
  message: string;
}

function parseHttpsUrl(value: string, label: string) {
  try {
    const parsed = new URL(value.trim());

    if (parsed.protocol !== "https:") {
      throw new Error();
    }

    return parsed.toString();
  } catch {
    throw new Error(`${label} must be a valid HTTPS URL.`);
  }
}

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
  const [loadingMode, setLoadingMode] = useState<"manual" | "batch" | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedRows, setUploadedRows] = useState<ImportedAnalysisRow[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number } | null>(null);
  const [batchSummary, setBatchSummary] = useState<{
    successes: BatchRunSuccess[];
    failures: BatchRunFailure[];
  } | null>(null);

  const loading = loadingMode !== null;

  const canSubmit = useMemo(
    () =>
      productName.trim() &&
      companyName.trim() &&
      companyWebsite.trim() &&
      productPageUrl.trim() &&
      targetAudience.trim() &&
      location.trim() &&
      productCategory.trim() &&
      competitorBrands.trim() &&
      authoritativeFacts.trim().length >= 20,
    [authoritativeFacts, companyName, companyWebsite, competitorBrands, location, productCategory, productName, productPageUrl, targetAudience],
  );

  function hydrateFormFromUpload(row: ImportedAnalysisRow) {
    setProductName(row.input.productName);
    setCompanyName(row.input.companyName);
    setCompanyWebsite(row.input.companyWebsite);
    setProductPageUrl(row.input.productPageUrl ?? "");
    setTargetAudience(row.input.targetAudience);
    setLocation(row.input.location);
    setProductCategory(row.input.productCategory);
    setCompetitorBrands(row.input.competitorBrands.join(", "));
    setAuthoritativeFacts(row.input.authoritativeFacts);
    setGoal(row.input.goal ?? goal);
    setError("");
  }

  async function runAndStoreAnalysis(payload: NewAnalysisInput) {
    if (!user) {
      throw new Error("You must be signed in.");
    }

    const analysis = await requestAnalysis(payload);
    const analysisId = await createAnalysisRecord({
      ...payload,
      ...analysis,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    });

    return analysisId;
  }

  async function onUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const csvText = await file.text();
      const parsedRows = parseAnalysisUpload(csvText, goal);

      setUploadedRows(parsedRows);
      setUploadedFileName(file.name);
      setBatchSummary(null);
      setError("");
    } catch (uploadError) {
      setUploadedRows([]);
      setUploadedFileName("");
      setBatchSummary(null);
      setError(getErrorMessage(uploadError, "Unable to read that CSV file."));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBatchSummary(null);

    if (!user) {
      setError("You must be signed in.");
      return;
    }

    try {
      setLoadingMode("manual");

      const payload: NewAnalysisInput = {
        productName: productName.trim(),
        companyName: companyName.trim(),
        companyWebsite: parseHttpsUrl(companyWebsite, "Company Website"),
        productPageUrl: parseHttpsUrl(productPageUrl, "Product Page URL"),
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

      const analysisId = await runAndStoreAnalysis(payload);
      router.push(`/analysis/${analysisId}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Unable to run the monitoring analysis right now."));
    } finally {
      setLoadingMode(null);
    }
  }

  async function runUploadedRows() {
    setError("");
    setBatchSummary(null);

    if (!user) {
      setError("You must be signed in.");
      return;
    }

    if (uploadedRows.length === 0) {
      setError("Upload a CSV before running imported analyses.");
      return;
    }

    const successes: BatchRunSuccess[] = [];
    const failures: BatchRunFailure[] = [];

    try {
      setLoadingMode("batch");

      for (const [index, row] of uploadedRows.entries()) {
        setBatchProgress({ completed: index, total: uploadedRows.length });

        try {
          const analysisId = await runAndStoreAnalysis(row.input);
          successes.push({
            id: analysisId,
            productName: row.input.productName,
            companyName: row.input.companyName,
            location: row.input.location,
          });
        } catch (batchError) {
          failures.push({
            rowNumber: row.rowNumber,
            productName: row.input.productName,
            message: getErrorMessage(batchError, "Unable to run this imported analysis."),
          });
        }
      }

      setBatchSummary({ successes, failures });

      if (successes.length > 1) {
        const params = new URLSearchParams({
          batch: successes.map((item) => item.id).join(","),
        });

        if (failures.length > 0) {
          params.set("failed", String(failures.length));
        }

        router.push(`/analysis/${successes[0].id}?${params.toString()}`);
        return;
      }

      if (successes.length === 1 && failures.length === 0) {
        router.push(`/analysis/${successes[0].id}`);
      }
    } finally {
      setBatchProgress(null);
      setLoadingMode(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden border-orange-100">
        <div className="border-b border-orange-100 bg-[linear-gradient(135deg,_#fff4e8_0%,_#ffffff_65%)] px-6 py-6 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">New Monitoring Run</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Measure how your product shows up in assistant shopping answers</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Upload a CSV exported from Excel or Google Sheets, or enter a single product manually. Both paths run the same 21-query monitoring workflow and store the results in Firestore.
          </p>
        </div>

        <div className="border-b border-orange-100 bg-orange-50/60 px-6 py-6 md:px-8">
          <div className="mx-auto max-w-4xl space-y-4">
            <div className="rounded-[28px] border border-orange-200/70 bg-white/72 p-5 shadow-[0_16px_32px_rgba(239,125,50,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Upload product data instead of filling the form row by row.</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Required columns: {REQUIRED_UPLOAD_COLUMNS.join(", ")}. An optional <span className="font-semibold">Goal</span> column is also supported.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
                    21-query workflow
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {uploadedRows.length > 0 ? `${uploadedRows.length} rows loaded` : "CSV optional"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white/84 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Upload CSV
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onUploadChange}
                  className="cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-orange-700"
                />
              </label>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">Choose a CSV, then import the first row into the form or run the whole batch.</p>
                <a
                  href="/templates/analysis-upload-template.csv"
                  download
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-700"
                >
                  Download CSV Template
                </a>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white/84 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
              <div className="grid gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => uploadedRows[0] && hydrateFormFromUpload(uploadedRows[0])}
                  disabled={uploadedRows.length === 0 || loading}
                  className="w-full"
                >
                  Import First Row
                </Button>
                <Button type="button" onClick={runUploadedRows} disabled={uploadedRows.length === 0 || loading} className="w-full">
                  {loadingMode === "batch"
                    ? batchProgress
                      ? `Running ${Math.min(batchProgress.completed + 1, batchProgress.total)}/${batchProgress.total}`
                      : "Running Imported Rows..."
                    : uploadedRows.length > 0
                      ? `Run Uploaded Rows (${uploadedRows.length})`
                      : "Run Uploaded Rows"}
                </Button>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Batch Status</p>
                  <p className="text-sm font-semibold text-slate-900">{uploadedRows.length > 0 ? `${uploadedRows.length} rows ready` : "No CSV loaded"}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {uploadedRows.length > 0
                    ? "Preview the uploaded rows below, import the first record into the manual form, or run the full batch."
                    : "Upload a CSV to preview products and run multiple monitoring analyses in one pass."}
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-5 max-w-4xl rounded-[28px] border border-slate-200 bg-white/88 p-4 md:p-5">
            {uploadedRows.length === 0 ? (
              <p className="text-sm text-slate-600">No CSV loaded yet. Upload a file to preview products and run analyses in batch.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{uploadedFileName}</p>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{uploadedRows.length} rows ready</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="pb-2 pr-4 font-semibold">Product</th>
                        <th className="pb-2 pr-4 font-semibold">Company</th>
                        <th className="pb-2 pr-4 font-semibold">Location</th>
                        <th className="pb-2 font-semibold">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {uploadedRows.slice(0, 5).map((row) => (
                        <tr key={`${row.rowNumber}-${row.input.productName}`}>
                          <td className="py-2 pr-4 text-slate-900">{row.input.productName}</td>
                          <td className="py-2 pr-4 text-slate-600">{row.input.companyName}</td>
                          <td className="py-2 pr-4 text-slate-600">{row.input.location}</td>
                          <td className="py-2 text-slate-600">{row.input.productCategory}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {uploadedRows.length > 5 ? (
                  <p className="text-xs text-slate-500">Preview limited to the first five rows. All uploaded rows will be analyzed.</p>
                ) : null}
              </div>
            )}
          </div>
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
                required
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
            <p className="text-xs text-slate-500">This goal also becomes the default for uploaded rows that do not include their own Goal column.</p>
          </label>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

          {batchSummary ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Imported analysis summary</p>
                <Link href="/history" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                  View History
                </Link>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Saved Runs</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-900">{batchSummary.successes.length}</p>
                  <div className="mt-3 space-y-2 text-sm text-emerald-900">
                    {batchSummary.successes.length === 0 ? (
                      <p>No rows completed successfully.</p>
                    ) : (
                      batchSummary.successes.slice(0, 4).map((item) => (
                        <Link key={item.id} href={`/analysis/${item.id}`} className="block underline decoration-emerald-300 underline-offset-4">
                          {item.productName} / {item.companyName} / {item.location}
                        </Link>
                      ))
                    )}
                    {batchSummary.successes.length > 4 ? <p>More runs are available in history.</p> : null}
                  </div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Rows Needing Attention</p>
                  <p className="mt-2 text-2xl font-bold text-rose-900">{batchSummary.failures.length}</p>
                  <div className="mt-3 space-y-2 text-sm text-rose-900">
                    {batchSummary.failures.length === 0 ? (
                      <p>All uploaded rows ran successfully.</p>
                    ) : (
                      batchSummary.failures.slice(0, 4).map((item) => (
                        <p key={`${item.rowNumber}-${item.productName}`}>
                          Row {item.rowNumber} / {item.productName}: {item.message}
                        </p>
                      ))
                    )}
                    {batchSummary.failures.length > 4 ? <p>Additional row errors were omitted from this summary.</p> : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button disabled={!canSubmit || loading} className="min-w-[180px]">
              {loadingMode === "manual" ? "Monitoring AI Answers..." : "Run Single Monitoring Analysis"}
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
