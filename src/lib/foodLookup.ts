/**
 * Turn a word or phrase into a catalog food id.
 *
 * Exact matching only (after lowercasing and trimming): "Scrambled eggs" → egg.
 * No fuzzy guessing, because a wrong guess could hide an allergen. If nothing
 * matches, the caller treats the food as unknown.
 */
import { FOOD_LIST } from "@/lib/data/foods";
import type { FoodId } from "@/lib/types";

export function normalizeFoodText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** alias → id, plus each id itself ("chicken_thigh" and "chicken thigh"). */
const ALIAS_INDEX: ReadonlyMap<string, FoodId> = (() => {
  const index = new Map<string, FoodId>();
  for (const [id, food] of FOOD_LIST) {
    index.set(id, id);
    index.set(id.replace(/_/g, " "), id);
    for (const alias of food.aliases) index.set(normalizeFoodText(alias), id);
  }
  return index;
})();

export function lookupFood(text: string): FoodId | undefined {
  return ALIAS_INDEX.get(normalizeFoodText(text));
}
