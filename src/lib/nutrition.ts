/**
 * Nutrition and cost totals, computed by code from the catalog.
 * Always shown as estimates ("~520 kcal"). The AI never supplies these numbers.
 */
import { getFood } from "@/lib/data/foods";
import { mealCost, sumPrices } from "@/lib/safety/budget";
import type { DayPlan, Meal, Nutrition } from "@/lib/types";

/** Estimated nutrition for ONE portion of a meal. */
export function mealNutrition(meal: Pick<Meal, "items">): Nutrition {
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const item of meal.items) {
    const n = getFood(item.foodId).nutrition;
    total.kcal += n.kcal * item.servings;
    total.protein += n.protein * item.servings;
    total.carbs += n.carbs * item.servings;
    total.fat += n.fat * item.servings;
  }
  // Rounded: these are estimates, so false precision would mislead.
  return {
    kcal: Math.round(total.kcal / 10) * 10,
    protein: Math.round(total.protein),
    carbs: Math.round(total.carbs),
    fat: Math.round(total.fat),
  };
}

export interface DayTotals {
  kcal: number;
  protein: number;
  cost: number;
}

/** A day's estimated calories, protein, and food cost (per-serving shares). */
export function dayTotals(day: Pick<DayPlan, "meals">): DayTotals {
  const nutrition = day.meals.map(mealNutrition);
  return {
    kcal: nutrition.reduce((sum, n) => sum + n.kcal, 0),
    protein: nutrition.reduce((sum, n) => sum + n.protein, 0),
    cost: sumPrices(day.meals.map(mealCost)),
  };
}
