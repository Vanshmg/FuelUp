/**
 * "Tap to regenerate" for one empty slot (a gap).
 *
 * Every candidate, from Gemini or the built-in templates, goes through
 * verifyMealInPlan(): the WHOLE plan is re-checked with the new meal in it.
 * A meal that's fine on its own can still push a later egg meal over the
 * weekly limit, and that must never slip through.
 *
 * Order: Gemini → one retry with the problems → built-in candidates → null
 * ("no safe option right now").
 */
import type { JsonAi } from "@/lib/ai/types";
import { AiMealSchema, singleMealJsonSchema } from "@/lib/ai/schemas";
import { buildMealPrompt } from "@/lib/ai/prompts";
import { canonicalizeMeal } from "@/lib/safety/canonical";
import { verifyMealInPlan, type Verified } from "@/lib/safety/verify";
import type { IsoDate, Meal, MealSlot, WeekPlan } from "@/lib/types";
import { toVerifyContext, type PlanRequest } from "./context";
import { sampleMealsForSlot, templateMealToMeal } from "./samplePlans";

export interface RegenerateAsk {
  date: IsoDate;
  slot: MealSlot;
  /** Why the previous meal in this slot was removed (sent to the AI). */
  reasons: string[];
}

export interface RegenerateResult {
  meal: Meal;
  plan: Verified<WeekPlan>;
  source: "ai" | "fallback";
}

function withoutGap(plan: WeekPlan, ask: RegenerateAsk): WeekPlan {
  const gaps = (plan.gaps ?? []).filter((g) => !(g.date === ask.date && g.slot === ask.slot));
  return { ...plan, gaps };
}

export async function regenerateMeal(
  req: PlanRequest,
  plan: WeekPlan,
  ask: RegenerateAsk,
  ai: JsonAi | null,
  newId: () => string,
): Promise<RegenerateResult | null> {
  const ctx = toVerifyContext(req);
  const day = plan.days.find((d) => d.date === ask.date);
  if (!day) return null;

  const tryMeal = (meal: Meal) => {
    const check = verifyMealInPlan(plan, ask.date, meal, ctx);
    return check.ok && check.plan
      ? { ok: true as const, result: { meal, plan: withoutGap(check.plan, ask) as Verified<WeekPlan> } }
      : { ok: false as const, problems: check.blocking.map((issue) => issue.message) };
  };

  // 1. Gemini, with one retry.
  if (ai) {
    const otherMeals = plan.days.flatMap((d) => d.meals.map((m) => `${d.date} ${m.slot}: ${m.name}`));
    let problems = ask.reasons;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const prompt = buildMealPrompt(req, { date: ask.date, slot: ask.slot, dayType: day.dayType, problems, otherMeals });
        const raw = await ai(prompt, singleMealJsonSchema());
        const parsed = AiMealSchema.safeParse(raw);
        if (!parsed.success) {
          problems = [...ask.reasons, "The reply didn't match the JSON schema."];
          continue;
        }
        // A regenerated meal is always fresh: no leftovers link, one portion.
        const { ingredients, ...rest } = parsed.data;
        const canonical = canonicalizeMeal(
          { ...rest, leftoverOf: undefined, id: newId(), slot: ask.slot, portions: 1, ingredients },
          ask.date,
        );
        if (!canonical.meal) {
          problems = [...ask.reasons, ...canonical.issues.map((i) => i.message)];
          continue;
        }
        const outcome = tryMeal(canonical.meal);
        if (outcome.ok) return { ...outcome.result, source: "ai" };
        problems = [...ask.reasons, ...outcome.problems];
      } catch (error) {
        console.warn("[FuelUp] AI call failed:", error instanceof Error ? error.message : String(error));
        break;
      }
    }
  }

  // 2. Built-in candidates, each verified against the whole plan.
  const taken = new Set(plan.days.flatMap((d) => d.meals.map((m) => m.name)));
  for (const { template, meal } of sampleMealsForSlot(ask.slot)) {
    const candidate = templateMealToMeal(template, meal, newId());
    if (taken.has(candidate.name)) continue;
    const outcome = tryMeal(candidate);
    if (outcome.ok) return { ...outcome.result, source: "fallback" };
  }

  return null;
}
