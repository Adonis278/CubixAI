import { NewAnalysisInput, AnalysisOutput } from "@/types/analysis";

export async function requestAnalysis(input: NewAnalysisInput): Promise<AnalysisOutput> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to run analysis");
  }

  return response.json();
}
