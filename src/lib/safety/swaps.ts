/**
 * Cheaper swaps that stay in the same ingredient ROLE.
 * Chicken breast → chicken thighs, yes. Chicken → spinach, never.
 *
 * Priority order: SAFETY, then allergens and diet, then price.
 * - cheaperCandidates(): same role, cheaper, passes the allergen/diet check.
 *   Internal building block only — never show these directly.
 * - safeSwaps(): the only thing the UI offers. Each candidate is swapped into
 *   the plan and the WHOLE plan is re-verified (weekly limits, expiry,
 *   leftovers). Example: Arjun at his egg limit won't be offered eggs instead
 *   of chicken, even though eggs are cheaper and the same role.
 *
 * Ranking: closest first ("same family": same kind of animal protein, or
 * for non-animal foods the same store section), then biggest saving.
 */
import { FOOD_LIST, getFood } from "@/lib/data/foods";
import type { AvoidTag, FoodId, WeekPlan } from "@/lib/types";
import { effectiveAvoidTags, isFoodAllowed } from "./allergens";
import { perServingCostCents } from "./budget";
import type { SafetyIssue } from "./issues";
import { checkPlanChange, type Verified, type VerifyContext } from "./verify";

const ANIMAL_TAGS: AvoidTag[] = ["poultry", "beef", "pork", "lamb", "fish", "shellfish"];

export interface Swap {
  foodId: FoodId;
  savingsPerServing: number;
  closeness: "same_family" | "same_role";
}

function animalKey(foodId: FoodId): string {
  return getFood(foodId)
    .contains.filter((tag) => ANIMAL_TAGS.includes(tag))
    .sort()
    .join(",");
}

function isSameFamily(a: FoodId, b: FoodId): boolean {
  const animalA = animalKey(a);
  if (animalA !== animalKey(b)) return false;
  return animalA !== "" || getFood(a).aisle === getFood(b).aisle;
}

export function cheaperCandidates(
  foodId: FoodId,
  avoidTags: readonly AvoidTag[],
  avoidFoods: readonly FoodId[] = [],
  limit = Infinity,
): Swap[] {
  const original = getFood(foodId);
  const originalCost = perServingCostCents(foodId);

  return FOOD_LIST.filter(
    ([id, food]) =>
      id !== foodId &&
      food.role === original.role &&
      perServingCostCents(id) < originalCost &&
      isFoodAllowed(id, avoidTags, avoidFoods),
  )
    .map(
      ([id]): Swap => ({
        foodId: id,
        savingsPerServing: (originalCost - perServingCostCents(id)) / 100,
        closeness: isSameFamily(foodId, id) ? "same_family" : "same_role",
      }),
    )
    .sort(
      (a, b) =>
        Number(b.closeness === "same_family") - Number(a.closeness === "same_family") ||
        b.savingsPerServing - a.savingsPerServing,
    )
    .slice(0, limit);
}

export interface SafeSwap extends Swap {
  /** The plan with the swap applied, verified end to end. */
  plan: Verified<WeekPlan>;
  /** New warnings the swap would add (e.g. produce freshness). */
  warnings: SafetyIssue[];
}

/** Replace a food in the plan: everywhere, or in one meal plus its leftovers. */
export function replaceFood(plan: WeekPlan, from: FoodId, to: FoodId, mealId?: string): WeekPlan {
  const inScope = (id: string, leftoverOf?: string) => !mealId || id === mealId || leftoverOf === mealId;
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      meals: day.meals.map((meal) =>
        inScope(meal.id, meal.leftoverOf)
          ? {
              ...meal,
              // A different food is a fresh purchase: drop any link to a pantry item.
              items: meal.items.map((item) => (item.foodId === from ? { foodId: to, servings: item.servings } : item)),
            }
          : meal,
      ),
    })),
  };
}

/**
 * Cheaper swaps that are safe for THIS plan. Pass `mealId` to swap in one
 * meal (and its leftovers), or leave it out to swap everywhere (grocery list).
 */
export function safeSwaps(
  plan: WeekPlan,
  foodId: FoodId,
  ctx: VerifyContext,
  options: { mealId?: string; limit?: number } = {},
): SafeSwap[] {
  const { mealId, limit = 3 } = options;
  const avoid = effectiveAvoidTags(ctx.profile);
  const safe: SafeSwap[] = [];

  for (const candidate of cheaperCandidates(foodId, avoid, ctx.profile.avoidFoods)) {
    const check = checkPlanChange(plan, replaceFood(plan, foodId, candidate.foodId, mealId), ctx);
    if (check.ok && check.plan) safe.push({ ...candidate, plan: check.plan, warnings: check.warnings });
    if (safe.length >= limit) break;
  }
  return safe;
}
