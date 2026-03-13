import { NewAnalysisForm } from "@/components/analysis/new-analysis-form";

export default function NewAnalysisPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Monitoring Analysis</h1>
        <p className="text-sm text-slate-600">
          Capture product-level share of shelf, source influence, and ethics signals for a specific audience and location.
        </p>
      </div>
      <NewAnalysisForm />
    </div>
  );
}
