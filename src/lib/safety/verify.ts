/**
 * THE safety gate. Every plan passes through here before a user sees it.
 *
 * - verifyPlan(): pure check → list of issues. Used by the AI retry loop
 *   (issues are sent back to Gemini) and to show warnings.
 * - enforcePlan(): applies the policy and returns a Verified plan:
 *   meals with a "block" issue are REMOVED (never shown); "warn" issues are
 *   returned so the UI can show them next to the meal.
 *
 * `Verified<T>` is a TypeScript "brand": only enforcePlan can produce one,
 * and UI components will only accept Verified data. So a code path that
 * skips the check simply won't compile.
 *
 * Run it again whenever time passes or the pantry changes: a plan that was
 * safe on Monday can contain expired chicken by Thursday.
 */
import { getFood } from "@/lib/data/foods";
import type { IsoDate, LogEntry, Meal, PantryItem, Profile, WeekPlan } from "@/lib/types";
import { checkMealAllergens, describePlace, effectiveAvoidTags } from "./allergens";
import { formatUsd, groceryNeeds, sumPrices } from "./budget";
import { expiresOn, freshPurchaseUseBy, isGoodOn, LEFTOVER_SHELF_LIFE, lastGoodDay } from "./expiry";
import { makeIssue, type SafetyIssue } from "./issues";
import { checkWeeklyLimits } from "./limits";

declare const VERIFIED: unique symbol;
export type Verified<T> = T & { readonly [VERIFIED]: true };

export interface VerifyContext {
  profile: Profile;
  pantry: readonly PantryItem[];
  logs: readonly LogEntry[];
  today: IsoDate;
}

interface DatedMeal {
  date: IsoDate;
  meal: Meal;
}

function allMeals(plan: WeekPlan): DatedMeal[] {
  return plan.days.flatMap((day) => day.meals.map((meal) => ({ date: day.date, meal })));
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

/** Pantry items the meal says it uses must exist and still be good that day. */
function checkPantryLinks({ date, meal }: DatedMeal, pantry: readonly PantryItem[]): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const where = describePlace({ date, slot: meal.slot });
  for (const item of meal.items) {
    if (!item.pantryItemId) continue;
    const atHome = pantry.find((p) => p.id === item.pantryItemId);
    const name = getFood(item.foodId).name;
    if (!atHome) {
      issues.push(
        makeIssue("expired", `${where}: "${meal.name}" uses ${name} from your kitchen, but it's no longer there.`, {
          mealId: meal.id, date, slot: meal.slot, foodId: item.foodId,
        }),
      );
    } else if (!isGoodOn(atHome, date)) {
      issues.push(
        makeIssue("expired", `${where}: "${meal.name}" uses your ${name}, which is likely past its best by then (use by ${expiresOn(atHome)}).`, {
          mealId: meal.id, date, slot: meal.slot, foodId: item.foodId,
        }),
      );
    }
  }
  return issues;
}

/**
 * Fresh groceries are assumed bought at the start of the plan. If a meal
 * uses a perishable after it would go bad, warn (freezing on shopping day
 * fixes it). Skipped if a pantry item of that food is still good that day.
 */
function checkPerishables({ date, meal }: DatedMeal, plan: WeekPlan, pantry: readonly PantryItem[]): SafetyIssue[] {
  if (meal.leftoverOf) return [];
  const issues: SafetyIssue[] = [];
  for (const item of meal.items) {
    if (item.pantryItemId) continue;
    const coveredAtHome = pantry.some((p) => p.kind === "grocery" && p.foodId === item.foodId && isGoodOn(p, date));
    if (coveredAtHome) continue;
    const useBy = freshPurchaseUseBy(item.foodId, plan.startDate);
    if (date > useBy) {
      const name = getFood(item.foodId).name;
      issues.push(
        makeIssue(
          "perishable_late",
          `${describePlace({ date, slot: meal.slot })}: ${name} bought at the start of the week won't keep until then. ` +
            `Move "${meal.name}" earlier, or freeze the ${name.toLowerCase()} on shopping day.`,
          { mealId: meal.id, date, slot: meal.slot, foodId: item.foodId },
        ),
      );
    }
  }
  return issues;
}

/** Leftover meals must trace back to a cook date and stay within the 4-day rule. */
function checkLeftovers(meals: DatedMeal[], pantry: readonly PantryItem[]): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const eatenFrom = new Map<string, number>();

  for (const { date, meal } of meals) {
    if (!meal.leftoverOf) continue;
    const where = describePlace({ date, slot: meal.slot });
    const base = { mealId: meal.id, date, slot: meal.slot };
    eatenFrom.set(meal.leftoverOf, (eatenFrom.get(meal.leftoverOf) ?? 0) + 1);

    const batch = meals.find((m) => m.meal.id === meal.leftoverOf && !m.meal.leftoverOf);
    const stored = pantry.find((p) => p.id === meal.leftoverOf && p.kind === "leftover");

    let cookedOn: IsoDate | undefined;
    let useBy: IsoDate | undefined;
    if (batch) {
      cookedOn = batch.date;
      useBy = lastGoodDay(batch.date, LEFTOVER_SHELF_LIFE.fridge);
    } else if (stored && stored.kind === "leftover") {
      cookedOn = stored.cookedOn;
      useBy = expiresOn(stored);
    }

    if (!cookedOn || !useBy) {
      issues.push(makeIssue("leftover_unknown", `${where}: "${meal.name}" is leftovers, but we can't tell when they were cooked.`, base));
    } else if (date < cookedOn) {
      issues.push(makeIssue("leftover_unknown", `${where}: "${meal.name}" is leftovers from a meal that isn't cooked yet.`, base));
    } else if (date > useBy) {
      issues.push(
        makeIssue("leftover_too_old", `${where}: "${meal.name}" leftovers would be past the 4-day limit (good through ${useBy}).`, base),
      );
    }
  }

  // More leftover meals than portions available?
  for (const [sourceId, count] of eatenFrom) {
    const batch = meals.find((m) => m.meal.id === sourceId);
    const stored = pantry.find((p) => p.id === sourceId);
    const available = batch ? batch.meal.portions - 1 : stored?.kind === "leftover" ? stored.portionsLeft : undefined;
    if (available !== undefined && count > available) {
      const name = batch?.meal.name ?? (stored?.kind === "leftover" ? stored.mealName : "leftovers");
      issues.push(makeIssue("not_enough_leftovers", `"${name}" is planned as leftovers ${count} times, but only ${available} portions are left.`));
    }
  }
  return issues;
}

function checkNewDishes(meals: DatedMeal[]): SafetyIssue[] {
  return meals
    .filter(({ meal }) => meal.isNew && !meal.leftoverOf)
    .slice(1)
    .map(({ date, meal }) =>
      makeIssue("too_many_new", `${describePlace({ date, slot: meal.slot })}: "${meal.name}" is a second new dish this week. One new dish a week keeps things familiar.`, {
        mealId: meal.id, date, slot: meal.slot,
      }),
    );
}

function checkBudget(plan: WeekPlan, ctx: VerifyContext): SafetyIssue[] {
  const total = sumPrices(groceryNeeds(plan, ctx.pantry).map((need) => need.price));
  if (total <= ctx.profile.weeklyBudget) return [];
  return [
    makeIssue(
      "over_budget",
      `This plan's groceries come to about ${formatUsd(total)}, over your ${formatUsd(ctx.profile.weeklyBudget)} budget by ${formatUsd(total - ctx.profile.weeklyBudget)}.`,
    ),
  ];
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

export function verifyPlan(plan: WeekPlan, ctx: VerifyContext): SafetyIssue[] {
  const avoidTags = effectiveAvoidTags(ctx.profile);
  const meals = allMeals(plan);

  return [
    ...meals.flatMap(({ date, meal }) => checkMealAllergens(meal, avoidTags, ctx.profile.avoidFoods, date)),
    ...meals.flatMap((dated) => checkPantryLinks(dated, ctx.pantry)),
    ...meals.flatMap((dated) => checkPerishables(dated, plan, ctx.pantry)),
    ...checkLeftovers(meals, ctx.pantry),
    ...checkWeeklyLimits(plan, ctx.logs, ctx.profile.weeklyLimits, ctx.today),
    ...checkNewDishes(meals),
    ...checkBudget(plan, ctx),
  ];
}

export interface RemovedMeal {
  date: IsoDate;
  slot: Meal["slot"];
  mealName: string;
  reasons: string[];
}

export interface EnforcedPlan {
  plan: Verified<WeekPlan>;
  /** Meals taken out for safety. The UI shows a "no safe option — regenerate" card. */
  removed: RemovedMeal[];
  /** Problems worth showing next to the meal (or the plan, if no mealId). */
  warnings: SafetyIssue[];
}

/**
 * Remove every meal with a blocking issue, then re-check (removing a batch
 * meal also invalidates its leftovers) until nothing blocks.
 */
export function enforcePlan(plan: WeekPlan, ctx: VerifyContext): EnforcedPlan {
  let current = plan;
  const removed: RemovedMeal[] = [];

  for (;;) {
    const issues = verifyPlan(current, ctx);
    const blocked = new Map<string, SafetyIssue[]>();
    for (const issue of issues) {
      if (issue.severity === "block" && issue.mealId) {
        blocked.set(issue.mealId, [...(blocked.get(issue.mealId) ?? []), issue]);
      }
    }

    if (blocked.size === 0) {
      return {
        plan: current as Verified<WeekPlan>,
        removed,
        warnings: issues.filter((issue) => issue.severity === "warn"),
      };
    }

    for (const day of current.days) {
      for (const meal of day.meals) {
        const reasons = blocked.get(meal.id);
        if (reasons) removed.push({ date: day.date, slot: meal.slot, mealName: meal.name, reasons: reasons.map((r) => r.message) });
      }
    }
    current = {
      ...current,
      days: current.days.map((day) => ({ ...day, meals: day.meals.filter((meal) => !blocked.has(meal.id)) })),
    };
  }
}
