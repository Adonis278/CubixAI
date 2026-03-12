import { NewAnalysisForm } from "@/components/analysis/new-analysis-form";

export default function NewAnalysisPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Analysis</h1>
        <p className="text-sm text-slate-600">Run an AI-assisted shopping visibility analysis for one company.</p>
      </div>
      <NewAnalysisForm />
    </div>
  );
}
