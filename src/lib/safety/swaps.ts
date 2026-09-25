/**
 * Cheaper swaps that stay in the same ingredient ROLE.
 * Chicken breast → chicken thighs, yes. Chicken → spinach, never.
 *
 * Ranking: closest first ("same family": same kind of animal protein, or
 * for non-animal foods the same store section), then biggest saving.
 * Every candidate passes the allergen check before it's offered.
 */
import { FOOD_LIST, getFood } from "@/lib/data/foods";
import type { AvoidTag, FoodId } from "@/lib/types";
import { isFoodAllowed } from "./allergens";
import { perServingCostCents } from "./budget";

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

export function cheaperSwaps(
  foodId: FoodId,
  avoidTags: readonly AvoidTag[],
  avoidFoods: readonly FoodId[] = [],
  limit = 3,
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
