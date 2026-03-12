import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runMockAnalysis } from "@/services/analysis-engine";

const analysisSchema = z.object({
  companyName: z.string().min(2),
  websiteUrl: z.string().url(),
  category: z.string().min(2),
  competitors: z.array(z.string().min(1)).min(1),
  businessDescription: z.string().optional(),
  goal: z.enum(["show up in AI searches", "drive traffic to website", "increase purchases"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analysisSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
    }

    const output = await runMockAnalysis(parsed.data);
    return NextResponse.json(output);
  } catch {
    return NextResponse.json({ message: "Failed to run analysis" }, { status: 500 });
  }
}
