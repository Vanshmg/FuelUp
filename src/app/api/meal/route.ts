/**
 * POST /api/meal: fill one empty slot ("tap to regenerate").
 * The new meal is verified against the WHOLE plan (weekly limits, expiry…)
 * before it's returned.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { geminiJsonAi } from "@/lib/ai/gemini";
import { PlanRequestSchema } from "@/lib/planner/context";
import { regenerateMeal } from "@/lib/planner/regenerate";
import { IsoDateSchema, MealSlotSchema, WeekPlanSchema } from "@/lib/types";

const MealRequestSchema = z.object({
  context: PlanRequestSchema,
  plan: WeekPlanSchema,
  ask: z.object({ date: IsoDateSchema, slot: MealSlotSchema, reasons: z.array(z.string()).max(20) }),
});

export async function POST(request: Request) {
  const parsed = MealRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That request didn't look right. Try again?" }, { status: 400 });
  }

  const { context, plan, ask } = parsed.data;
  const result = await regenerateMeal(context, plan, ask, geminiJsonAi(), () => crypto.randomUUID());
  if (!result) {
    return NextResponse.json({ error: "No safe option for this slot right now. Try again later, or plan it yourself." }, { status: 200 });
  }
  return NextResponse.json(result);
}
