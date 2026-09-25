/**
 * The plan pipeline: AI proposes, code verifies.
 *
 *   prompt (built by code)
 *     → Gemini (JSON with a strict schema)
 *     → zod validation              (bad JSON = failed attempt)
 *     → catalog ids (canonicalize)  (unknown ingredient = blocked meal)
 *     → verifyPlan()                (allergens, limits, expiry, leftovers…)
 *     → problems? ONE retry, sending the exact problems back
 *     → enforcePlan()               (anything still unsafe is removed → a "gap")
 *
 * No key, a network error, a timeout, or two bad replies → a built-in sample
 * week (diet-aware), through the same safety gate. It never throws.
 */
import type { JsonAi } from "@/lib/ai/types";
import { AiPlanSchema, planJsonSchema, type AiMeal } from "@/lib/ai/schemas";
import { buildPlanPrompt } from "@/lib/ai/prompts";
import { canonicalizeMeal } from "@/lib/safety/canonical";
import type { SafetyIssue } from "@/lib/safety/issues";
import { enforcePlan, verifyPlan, type Verified } from "@/lib/safety/verify";
import type { Meal, PlanGap, WeekPlan } from "@/lib/types";
import { planDays, toVerifyContext, type PlanDay, type PlanRequest } from "./context";
import { pickSamplePlan } from "./samplePlans";

export interface PlanResult {
  plan: Verified<WeekPlan>;
  source: "ai" | "fallback";
  /** Friendly note for the user, e.g. why a built-in plan was used. */
  notice?: string;
  /** How many AI calls were made (0–2). Shown in development only. */
  attempts: number;
}

export interface PipelineOptions {
  planId: string;
  createdAt: string;
}

interface Attempt {
  plan: WeekPlan;
  /** Meals dropped before verification (unknown ingredients). */
  gaps: PlanGap[];
  /** Every problem, for the retry message: structure, unknown ingredients, safety. */
  problems: string[];
  blocking: boolean;
}

type AttemptOutcome = { ok: true; attempt: Attempt } | { ok: false; reason: string };

/** Turn a validated AI reply into a WeekPlan on OUR dates, with catalog ids. */
function toWeekPlan(raw: unknown, days: readonly PlanDay[], opts: PipelineOptions): AttemptOutcome {
  const parsed = AiPlanSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "The reply didn't match the required JSON shape." };

  const problems: string[] = [];
  const gaps: PlanGap[] = [];
  const usedIds = new Set<string>();
  // AI ids → our ids, so leftovers can point at their batch meal.
  const idMap = new Map<string, string>();
  const byDate = new Map(parsed.data.days.map((day) => [day.date, day.meals]));

  const drafts = days.map((day, dayIndex) => {
    const meals = byDate.get(day.date);
    if (!meals) problems.push(`${day.date} is missing. Plan every date given.`);
    return (meals ?? []).map((aiMeal: AiMeal, mealIndex) => {
      let id = `${opts.planId}-${dayIndex}-${mealIndex}`;
      while (usedIds.has(id)) id += "x";
      usedIds.add(id);
      if (!idMap.has(aiMeal.id)) idMap.set(aiMeal.id, id);
      return { date: day.date, aiMeal, id };
    });
  });

  const planDaysOut = days.map((day, i) => ({
    date: day.date,
    dayType: day.dayType,
    meals: drafts[i].flatMap(({ date, aiMeal, id }): Meal[] => {
      const { ingredients, leftoverOf, ...rest } = aiMeal;
      const mappedLeftover = leftoverOf ? (idMap.get(leftoverOf) ?? leftoverOf) : undefined;
      const result = canonicalizeMeal(
        { ...rest, id, ingredients, ...(mappedLeftover && { leftoverOf: mappedLeftover }) },
        date,
      );
      if (!result.meal) {
        problems.push(...result.issues.map((issue) => issue.message));
        gaps.push({ date, slot: aiMeal.slot, mealName: aiMeal.name, reasons: result.issues.map((i) => i.message) });
        return [];
      }
      return [result.meal];
    }),
  }));

  const plan: WeekPlan = { id: opts.planId, startDate: days[0].date, createdAt: opts.createdAt, source: "ai", days: planDaysOut };
  return { ok: true, attempt: { plan, gaps, problems, blocking: gaps.length > 0 || problems.length > 0 } };
}

async function runAttempt(
  ai: JsonAi,
  prompt: string,
  schema: object,
  days: readonly PlanDay[],
  req: PlanRequest,
  opts: PipelineOptions,
): Promise<AttemptOutcome> {
  let raw: unknown;
  try {
    raw = await ai(prompt, schema);
  } catch (error) {
    // Never log the key; the message from the SDK/network is enough.
    console.warn("[FuelUp] AI call failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, reason: "The AI call failed." };
  }

  const outcome = toWeekPlan(raw, days, opts);
  if (!outcome.ok) return outcome;

  const issues: SafetyIssue[] = verifyPlan(outcome.attempt.plan, toVerifyContext(req));
  const attempt = outcome.attempt;
  return {
    ok: true,
    attempt: {
      ...attempt,
      problems: [...attempt.problems, ...issues.map((issue) => issue.message)],
      blocking: attempt.blocking || issues.some((issue) => issue.severity === "block"),
    },
  };
}

function finish(attempt: Attempt, req: PlanRequest, attempts: number): PlanResult {
  const enforced = enforcePlan(attempt.plan, toVerifyContext(req));
  const gaps = [...attempt.gaps, ...enforced.removed];
  const plan = { ...enforced.plan, ...(gaps.length && { gaps }) } as Verified<WeekPlan>;
  return { plan, source: "ai", attempts };
}

function fallback(req: PlanRequest, days: readonly PlanDay[], opts: PipelineOptions, notice: string, attempts: number): PlanResult {
  const pick = pickSamplePlan(req, days, opts.planId, opts.createdAt);
  const plan = { ...pick.plan, ...(pick.removed.length && { gaps: pick.removed }) } as Verified<WeekPlan>;
  return { plan, source: "fallback", notice, attempts };
}

export async function planWeek(req: PlanRequest, ai: JsonAi | null, opts: PipelineOptions): Promise<PlanResult> {
  const days = planDays(req.profile, req.today);

  if (!ai) {
    return fallback(req, days, opts, "No Gemini key is set, so this is one of FuelUp's built-in weeks (still safety-checked for you). Add a key in .env.local for a personalized plan.", 0);
  }

  const schema = planJsonSchema();
  const first = await runAttempt(ai, buildPlanPrompt(req, days), schema, days, req, opts);

  // Attempt 1 unusable (error or bad JSON): one more try, then built-in.
  if (!first.ok) {
    const second = await runAttempt(ai, buildPlanPrompt(req, days, [first.reason, "Return only valid JSON that matches the schema."]), schema, days, req, opts);
    if (!second.ok) {
      return fallback(req, days, opts, "Gemini didn't come through this time, so this is one of FuelUp's built-in weeks (safety-checked). Try again in a bit for a personalized plan.", 2);
    }
    return finish(second.attempt, req, 2);
  }

  // Attempt 1 usable but has problems: one retry with the exact problems.
  if (first.attempt.blocking) {
    const second = await runAttempt(ai, buildPlanPrompt(req, days, first.attempt.problems), schema, days, req, opts);
    // If the retry itself fails, keep attempt 1: enforcePlan removes its unsafe meals.
    return finish(second.ok ? second.attempt : first.attempt, req, 2);
  }

  return finish(first.attempt, req, 1);
}
