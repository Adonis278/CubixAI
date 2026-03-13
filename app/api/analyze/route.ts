import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  InvalidOpenAIResponseError,
  MissingOpenAIConfigError,
  OpenAIAnalysisError,
  runOpenAIAnalysis,
} from "@/services/analysis-engine";

export const runtime = "nodejs";

const analysisSchema = z.object({
  productName: z.string().min(2),
  companyName: z.string().min(2),
  companyWebsite: z.string().url(),
  productPageUrl: z.string().url().optional(),
  targetAudience: z.string().min(2),
  location: z.string().min(2),
  productCategory: z.string().min(2),
  competitorBrands: z.array(z.string().min(1)).min(1),
  authoritativeFacts: z.string().min(20),
  goal: z.enum(["increase AI share of shelf", "improve local ranking", "reduce factual errors"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analysisSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
    }

    const output = await runOpenAIAnalysis(parsed.data);
    return NextResponse.json(output);
  } catch (error) {
    if (error instanceof MissingOpenAIConfigError) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    if (error instanceof InvalidOpenAIResponseError) {
      return NextResponse.json({ message: error.message }, { status: 502 });
    }

    if (error instanceof OpenAIAnalysisError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Failed to run analysis" }, { status: 500 });
  }
}
