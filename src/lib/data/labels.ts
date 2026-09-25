/** Friendly names and emoji for every choice the user sees. */
import type { AvoidTag, Cuisine, DayType, Diet, EffortLevel } from "@/lib/types";

export const EFFORT_OPTIONS: Record<EffortLevel, { emoji: string; label: string; blurb: string }> = {
  zero_cook: {
    emoji: "🥡",
    label: "Zero-cook",
    blurb: "Ready-made and assembly meals. No stove needed, ever.",
  },
  minimal_cook: {
    emoji: "🍳",
    label: "Minimal cook",
    blurb: "Quick stuff, and cook once to eat a few times.",
  },
  likes_cooking: {
    emoji: "🧑‍🍳",
    label: "I like cooking",
    blurb: "Real recipes, batch cooking on free days.",
  },
};

export const CUISINE_OPTIONS: Record<Cuisine, { emoji: string; label: string }> = {
  american: { emoji: "🍔", label: "American" },
  mexican: { emoji: "🌮", label: "Mexican" },
  chinese: { emoji: "🥡", label: "Chinese" },
  korean: { emoji: "🍲", label: "Korean" },
  japanese: { emoji: "🍣", label: "Japanese" },
  thai: { emoji: "🍜", label: "Thai" },
  vietnamese: { emoji: "🥖", label: "Vietnamese" },
  indian: { emoji: "🍛", label: "Indian" },
  italian: { emoji: "🍝", label: "Italian" },
  mediterranean: { emoji: "🫒", label: "Mediterranean" },
  middle_eastern: { emoji: "🧆", label: "Middle Eastern" },
};

export const DIET_OPTIONS: Record<Diet, { emoji: string; label: string }> = {
  none: { emoji: "🍽️", label: "No specific diet" },
  vegetarian: { emoji: "🥦", label: "Vegetarian" },
  vegan: { emoji: "🌱", label: "Vegan" },
  pescatarian: { emoji: "🐟", label: "Pescatarian" },
};

/** Allergens first (most common), then animal groups. */
export const AVOID_OPTIONS: Record<AvoidTag, { emoji: string; label: string }> = {
  peanut: { emoji: "🥜", label: "Peanuts" },
  tree_nut: { emoji: "🌰", label: "Tree nuts" },
  dairy: { emoji: "🥛", label: "Dairy" },
  egg: { emoji: "🥚", label: "Eggs" },
  soy: { emoji: "🫘", label: "Soy" },
  wheat: { emoji: "🌾", label: "Wheat / gluten" },
  fish: { emoji: "🐟", label: "Fish" },
  shellfish: { emoji: "🦐", label: "Shellfish" },
  sesame: { emoji: "🥯", label: "Sesame" },
  chocolate: { emoji: "🍫", label: "Chocolate" },
  poultry: { emoji: "🐓", label: "All poultry" },
  chicken: { emoji: "🍗", label: "Chicken" },
  turkey: { emoji: "🦃", label: "Turkey" },
  duck: { emoji: "🦆", label: "Duck" },
  beef: { emoji: "🥩", label: "Beef" },
  pork: { emoji: "🥓", label: "Pork" },
  lamb: { emoji: "🐑", label: "Lamb" },
};

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  packed: "Packed day",
  busy: "Busy day",
  free: "Free day",
  out: "Eating out",
};
