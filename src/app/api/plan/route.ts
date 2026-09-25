/**
 * POST /api/plan: build a verified week.
 * Body: PlanRequest (profile, pantry, logs, events, today), validated with zod.
 * Always answers with JSON; never exposes the API key or a stack trace.
 */
import { NextResponse } from "next/server";
import { geminiJsonAi, withDebugForcedRetry } from "@/lib/ai/gemini";
import { PlanRequestSchema } from "@/lib/planner/context";
import { planWeek } from "@/lib/planner/pipeline";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That request didn't look right. Try again?" }, { status: 400 });
  }

  const parsed = PlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Some saved data looks off. Try reloading the page." }, { status: 400 });
  }

  const gemini = geminiJsonAi();
  const result = await planWeek(parsed.data, gemini && withDebugForcedRetry(gemini), {
    planId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json(result);
}
