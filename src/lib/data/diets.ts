/**
 * Diets are presets: each one expands into hard-avoid tags in code.
 * Storing "vegetarian" (instead of six tags) keeps the profile readable and
 * lets us fix a preset in one place.
 */
import type { AvoidTag, Diet } from "@/lib/types";

const MEAT: AvoidTag[] = ["chicken", "turkey", "duck", "beef", "pork", "lamb"];
const SEAFOOD: AvoidTag[] = ["fish", "shellfish"];

export const DIET_AVOIDS: Record<Diet, AvoidTag[]> = {
  none: [],
  pescatarian: MEAT,
  vegetarian: [...MEAT, ...SEAFOOD],
  vegan: [...MEAT, ...SEAFOOD, "dairy", "egg"],
};

export const DIET_LABELS: Record<Diet, string> = {
  none: "No specific diet",
  pescatarian: "Pescatarian",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
};
