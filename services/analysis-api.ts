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
    let message = "Unable to run analysis";
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = await response.json().catch(() => null);
      if (payload && typeof payload.message === "string" && payload.message.trim()) {
        message = payload.message;
      }
    } else {
      const fallbackText = await response.text();
      if (fallbackText.trim()) {
        message = fallbackText;
      }
    }

    throw new Error(message);
  }

  return response.json();
}
