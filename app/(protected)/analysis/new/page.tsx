import { NewAnalysisForm } from "@/components/analysis/new-analysis-form";

export default function NewAnalysisPage() {
  return (
    <div className="space-y-6">
      <section className="section-panel p-6">
        <p className="eyebrow">Run Setup</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Configure the product and evidence baseline before the scan starts.</h1>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
          Capture product-level share of shelf, source influence, and ethics signals for a specific audience and location, either one product at a time or from an uploaded CSV.
        </p>
      </section>
      <NewAnalysisForm />
    </div>
  );
}
