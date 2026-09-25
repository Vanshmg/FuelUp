/**
 * Turn ingredient names from the AI into catalog ids.
 *
 * Accepts an exact catalog id ("chicken_thigh") or an exact alias
 * ("scrambled eggs" → egg). Anything else is UNKNOWN, and an unknown
 * ingredient is a failed check: we can't verify what we don't know
 * (e.g. "pad thai sauce" could hide peanuts and fish sauce).
 */
import { lookupFood } from "@/lib/foodLookup";
import type { MealItem } from "@/lib/types";

export interface RawIngredient {
  food: string;
  servings: number;
  pantryItemId?: string;
}

export interface CanonicalResult {
  items: MealItem[];
  /** Ingredient names that didn't match the catalog. */
  unknown: string[];
}

export function canonicalizeIngredients(raw: RawIngredient[]): CanonicalResult {
  const items: MealItem[] = [];
  const unknown: string[] = [];
  for (const ingredient of raw) {
    const foodId = lookupFood(ingredient.food);
    if (!foodId) {
      unknown.push(ingredient.food);
      continue;
    }
    items.push({
      foodId,
      servings: ingredient.servings,
      ...(ingredient.pantryItemId && { pantryItemId: ingredient.pantryItemId }),
    });
  }
  return { items, unknown };
}
