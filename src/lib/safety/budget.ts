/**
 * Money math. Always done by code, in whole cents, so 0.1 + 0.2 never
 * becomes 0.30000000000000004.
 *
 * Two different numbers, on purpose:
 * - MEAL COST: the per-serving share of each ingredient ("~$2.40 a plate").
 * - GROCERY COST: whole packages you actually buy (a dozen eggs, not 2 eggs).
 *   The weekly budget is compared against grocery cost.
 */
import { getFood } from "@/lib/data/foods";
import type { FoodId, GroceryListItem, IsoDate, Meal, PantryItem, WeekPlan } from "@/lib/types";
import { isGoodOn } from "./expiry";

export const toCents = (usd: number): number => Math.round(usd * 100);
export const fromCents = (cents: number): number => cents / 100;

/** "$12.50" */
export function formatUsd(usd: number): string {
  const cents = toCents(usd);
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export function perServingCostCents(foodId: FoodId): number {
  const { price } = getFood(foodId);
  return Math.round((price.cost * 100) / price.servings);
}

/** Estimated cost of ONE portion of a meal. */
export function mealCost(meal: Pick<Meal, "items">): number {
  const cents = meal.items.reduce((sum, item) => sum + perServingCostCents(item.foodId) * item.servings, 0);
  return fromCents(Math.round(cents));
}

/** Whole packages needed to cover some servings. */
export function packagesFor(foodId: FoodId, servings: number): number {
  if (servings <= 0) return 0;
  // Small epsilon so 6 servings of a 6-serving pack is 1 package, not 2.
  return Math.ceil(servings / getFood(foodId).price.servings - 1e-9);
}

export interface GroceryNeed {
  foodId: FoodId;
  servings: number;
  packages: number;
  price: number;
}

/**
 * What the plan needs from the store, in whole packages.
 * - Batch meals need all their portions; leftover meals need nothing new.
 * - Ingredients linked to a pantry item are already at home.
 * - A food with a pantry item still good at the plan's start is treated as
 *   covered (we don't track exact amounts at home; this is an estimate).
 */
export function groceryNeeds(plan: WeekPlan, pantry: readonly PantryItem[]): GroceryNeed[] {
  const servingsByFood = new Map<FoodId, number>();
  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (meal.leftoverOf) continue;
      for (const item of meal.items) {
        if (item.pantryItemId) continue;
        servingsByFood.set(item.foodId, (servingsByFood.get(item.foodId) ?? 0) + item.servings * meal.portions);
      }
    }
  }

  const atHome = new Set(
    pantry.flatMap((item) => (item.kind === "grocery" && isGoodOn(item, plan.startDate) ? [item.foodId] : [])),
  );

  const needs: GroceryNeed[] = [];
  for (const [foodId, servings] of servingsByFood) {
    if (atHome.has(foodId)) continue;
    const packages = packagesFor(foodId, servings);
    needs.push({ foodId, servings, packages, price: fromCents(packages * toCents(getFood(foodId).price.cost)) });
  }
  return needs;
}

export function sumPrices(prices: readonly number[]): number {
  return fromCents(prices.reduce((sum, price) => sum + toCents(price), 0));
}

export function listTotal(items: readonly GroceryListItem[]): number {
  return sumPrices(items.map((item) => item.price));
}

export interface BudgetStatus {
  budget: number;
  spent: number;
  remaining: number;
  over: boolean;
}

export function budgetStatus(budget: number, spent: number): BudgetStatus {
  const remainingCents = toCents(budget) - toCents(spent);
  return { budget, spent, remaining: fromCents(remainingCents), over: remainingCents < 0 };
}

/** Money actually spent on groceries bought from `weekStart` (e.g. last shopping day) through `today`. */
export function spentThisWeek(pantry: readonly PantryItem[], today: IsoDate, weekStart: IsoDate): number {
  return sumPrices(
    pantry.flatMap((item) =>
      item.kind === "grocery" && item.pricePaid !== undefined && item.purchasedOn >= weekStart && item.purchasedOn <= today
        ? [item.pricePaid]
        : [],
    ),
  );
}
