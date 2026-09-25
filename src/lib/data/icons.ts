/**
 * Fallback icons for foods without a good emoji, by role.
 * e.g. tempeh has no emoji, so it shows 🍗 as a protein.
 */
import type { FoodRole } from "@/lib/types";

export const ROLE_ICONS: Record<FoodRole, string> = {
  protein: "🍗",
  legume: "🫘",
  leafy_veg: "🥬",
  veg: "🥕",
  fruit: "🍎",
  grain: "🌾",
  dairy: "🧀",
  snack: "🍿",
  ready_made: "🍱",
  sauce: "🫙",
  fat_oil: "🫒",
  spice: "🧂",
};

/** The emoji for a food, falling back to its role's icon. */
export function foodEmoji(food: { emoji?: string; role: FoodRole }): string {
  return food.emoji ?? ROLE_ICONS[food.role];
}
