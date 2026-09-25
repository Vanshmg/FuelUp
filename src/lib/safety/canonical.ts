/**
 * Turn ingredient names from the AI into catalog ids.
 *
 * Accepts an exact catalog id ("chicken_thigh") or an exact alias
 * ("scrambled eggs" → egg). Anything else is UNKNOWN, and an unknown
 * ingredient is a failed check: we can't verify what we don't know
 * (e.g. "pad thai sauce" could hide peanuts and fish sauce).
 */
import { lookupFood } from "@/lib/foodLookup";
import type { IsoDate, Meal, MealItem } from "@/lib/types";
import { describePlace } from "./allergens";
import { makeIssue, type SafetyIssue } from "./issues";

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

/** A meal as the AI describes it: ingredient names instead of catalog ids. */
export type DraftMeal = Omit<Meal, "items"> & { ingredients: RawIngredient[] };

export interface CanonicalMeal {
  /** The meal with catalog ids, or null if any ingredient is unknown. */
  meal: Meal | null;
  /** One blocking unknown_ingredient issue per unknown name, tied to this meal. */
  issues: SafetyIssue[];
}

/**
 * Phase 5 runs every AI meal through this before verifyPlan. A meal with an
 * unknown ingredient is never partially accepted (dropping the unknown item
 * could hide an allergen); it's reported, sent back in the retry, and
 * removed if it's still unknown afterwards.
 */
export function canonicalizeMeal(draft: DraftMeal, date?: IsoDate): CanonicalMeal {
  const { ingredients, ...rest } = draft;
  const { items, unknown } = canonicalizeIngredients(ingredients);
  if (unknown.length === 0 && items.length > 0) return { meal: { ...rest, items }, issues: [] };

  const where = describePlace({ date, slot: draft.slot });
  const names = unknown.length ? unknown : ["(no ingredients)"];
  return {
    meal: null,
    issues: names.map((name) =>
      makeIssue(
        "unknown_ingredient",
        `${where}: "${draft.name}" uses "${name}", which isn't in FuelUp's food list, so it can't be safety-checked. Use a listed food instead.`,
        { mealId: draft.id, date, slot: draft.slot },
      ),
    ),
  };
}
