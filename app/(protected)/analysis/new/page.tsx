import { NewAnalysisForm } from "@/components/analysis/new-analysis-form";

export default function NewAnalysisPage() {
  return (
    <div className="space-y-6">
      <section className="section-panel p-6">
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Configure the product and evidence baseline before the scan starts.</h1>
      </section>
      <NewAnalysisForm />
    </div>
  );
}
