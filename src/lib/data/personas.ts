/**
 * Demo personas. One per user type, each exercising a different part of the app.
 *
 * Personas are built relative to "today", so pantry heads-ups and weekly-limit
 * counts always look realistic whenever the demo is loaded.
 *
 * | Persona | User type          | What it tests                                  |
 * |---------|--------------------|------------------------------------------------|
 * | Jae     | Zero-cook          | Ready-made meals, peanut hard-avoid blocking   |
 * | Arjun   | Motivated but lazy | Weekly-limit counting (eggs 4x, chocolate 3x)  |
 * | Sofia   | Likes cooking      | Vegetarian + dairy-free, deeper insights       |
 *
 * Logged foods are written as the text a user would type, and go through the
 * same lookup as real logs. We never hand-assign a food id to a label, so the
 * label and the id can't disagree.
 */
import { addDays } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { lookupFood } from "@/lib/foodLookup";
import { PROFILE_DEFAULTS } from "@/lib/data/defaults";
import type {
  AppEvent,
  AppState,
  FoodId,
  IsoDate,
  LoggedItem,
  LogEntry,
  MealSlot,
  Nutrition,
  PantryItem,
  StorageLocation,
} from "@/lib/types";

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  userType: string;
  tagline: string;
  /** What this persona is designed to exercise. Shown on the demo picker. */
  tests: string;
  build(today: IsoDate): Omit<AppState, "version">;
}

// ---------------------------------------------------------------------------
// Small builders, so persona data reads like a story
// ---------------------------------------------------------------------------

function bought(
  foodId: FoodId,
  daysAgo: number,
  today: IsoDate,
  storage: StorageLocation,
  openedDaysAgo?: number,
): PantryItem {
  return {
    kind: "grocery",
    id: newId(),
    foodId,
    purchasedOn: addDays(today, -daysAgo),
    storage,
    opened: openedDaysAgo !== undefined,
    ...(openedDaysAgo !== undefined && { openedOn: addDays(today, -openedDaysAgo) }),
  };
}

function leftover(
  mealName: string,
  foodIds: FoodId[],
  cookedDaysAgo: number,
  portionsLeft: number,
  today: IsoDate,
): PantryItem {
  return {
    kind: "leftover",
    id: newId(),
    mealName,
    foodIds,
    cookedOn: addDays(today, -cookedDaysAgo),
    storage: "fridge",
    portionsLeft,
  };
}

/** What a user typed, matched against the catalog exactly like a real log. */
function typed(text: string, servings = 1): LoggedItem {
  const foodId = lookupFood(text);
  return foodId ? { foodId, label: text, servings } : { label: text, servings };
}

/** Something outside the catalog, with a rough (labeled) estimate. */
function freeText(label: string, estimate: Nutrition): LoggedItem {
  return { label, servings: 1, estimate };
}

function log(
  daysAgo: number,
  slot: MealSlot,
  items: LoggedItem[],
  today: IsoDate,
  source: LogEntry["source"] = "quick_log",
): LogEntry {
  return { id: newId(), date: addDays(today, -daysAgo), slot, items, source };
}

/** Weekly purchases over the past few weeks, so "Your usuals" has history. */
function purchaseHistory(foodIds: FoodId[], weeks: number, today: IsoDate): AppEvent[] {
  const events: AppEvent[] = [];
  for (let week = 1; week <= weeks; week++) {
    for (const foodId of foodIds) {
      events.push({ id: newId(), type: "purchase", date: addDays(today, -7 * week), foodId });
    }
  }
  return events;
}

// ---------------------------------------------------------------------------
// Jae — zero-cook, Korean/American, peanut allergy (hard avoid)
// ---------------------------------------------------------------------------

const jae: Persona = {
  id: "jae",
  name: "Jae",
  emoji: "🍙",
  userType: "Zero-cook",
  tagline: "Won't cook, loves Korean snacks and quick American bites.",
  tests: "Ready-made meals and peanut hard-avoid blocking (granola, trail mix, satay…)",
  build(today) {
    return {
      personaId: "jae",
      profile: {
        ...PROFILE_DEFAULTS,
        name: "Jae",
        effort: "zero_cook",
        cuisines: ["korean", "american"],
        diet: "none",
        avoidTags: ["peanut"],
        avoidFoods: [],
        weeklyLimits: [],
        weeklyBudget: 40,
        dayTypes: { mon: "packed", tue: "packed", wed: "busy", thu: "packed", fri: "out", sat: "free", sun: "free" },
        proteinTargetG: 90,
        askedAbout: ["budget"],
      },
      plan: null,
      groceryList: [],
      pantry: [
        bought("rotisserie_chicken", 2, today, "fridge"), // cooked chicken, 3–4 days: good through tomorrow → heads-up
        bought("bagged_salad", 2, today, "fridge"), // use by tomorrow → heads-up
        bought("greek_yogurt", 4, today, "fridge"),
        bought("kimchi", 20, today, "fridge", 10),
        bought("banana", 3, today, "pantry"),
        bought("frozen_pork_dumplings", 10, today, "freezer"),
        bought("microwave_rice", 10, today, "pantry"),
        bought("instant_ramen", 10, today, "pantry"),
        bought("seaweed_snack", 6, today, "pantry"),
        bought("chips", 6, today, "pantry", 2),
      ],
      logs: [
        log(1, "lunch", [typed("chips"), freeText("Burrito bowl", { kcal: 750, protein: 32, carbs: 85, fat: 28 })], today),
        log(2, "dinner", [typed("shin ramyun"), typed("kimchi")], today),
        // Hot Cheetos aren't plain chips (they contain dairy), so they stay free text.
        log(3, "snack", [freeText("Hot Cheetos", { kcal: 170, protein: 2, carbs: 15, fat: 11 })], today),
      ],
      events: [
        ...purchaseHistory(["greek_yogurt", "rotisserie_chicken", "instant_ramen", "banana", "chips"], 3, today),
        { id: newId(), type: "reject", date: addDays(today, -9), mealName: "Overnight oats", foodId: "oats" },
        { id: newId(), type: "reject", date: addDays(today, -4), mealName: "Overnight oats", foodId: "oats" },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// Arjun — minimal cook, North Indian, mostly veg + chicken,
// mild egg and chocolate allergies as weekly limits
// ---------------------------------------------------------------------------

const arjun: Persona = {
  id: "arjun",
  name: "Arjun",
  emoji: "🍛",
  userType: "Motivated but a little lazy",
  tagline: "Mostly veg plus chicken. Wants ghar ka khana without the effort.",
  tests: "Weekly-limit counting: eggs max 4x, chocolate max 3x (2 eggs + 1 chocolate already logged)",
  build(today) {
    return {
      personaId: "arjun",
      profile: {
        ...PROFILE_DEFAULTS,
        name: "Arjun",
        effort: "minimal_cook",
        cuisines: ["indian"],
        diet: "none",
        // "Mostly veg plus chicken": no beef or pork. Change in onboarding if needed.
        avoidTags: ["beef", "pork"],
        avoidFoods: [],
        weeklyLimits: [
          { tag: "egg", maxPerWeek: 4 },
          { tag: "chocolate", maxPerWeek: 3 },
        ],
        weeklyBudget: 45,
        dayTypes: { mon: "busy", tue: "packed", wed: "busy", thu: "packed", fri: "free", sat: "free", sun: "busy" },
        nutritionGoal: "more_protein",
        proteinTargetG: 80,
        askedAbout: ["budget", "nutritionGoal"],
      },
      plan: null,
      groceryList: [],
      pantry: [
        bought("chicken_thigh", 0, today, "fridge"), // raw chicken: cook or freeze by tomorrow
        bought("spinach", 3, today, "fridge"), // use by tomorrow
        bought("egg", 5, today, "fridge"),
        bought("paneer", 3, today, "fridge"),
        bought("plain_yogurt", 2, today, "fridge", 1),
        bought("tomato", 2, today, "pantry"),
        bought("onion", 9, today, "pantry"),
        bought("frozen_roti", 12, today, "freezer"),
        bought("toor_dal", 20, today, "pantry"),
        bought("white_rice", 20, today, "pantry"),
        bought("dark_chocolate", 6, today, "pantry", 1),
        leftover("Rajma chawal", ["kidney_beans", "onion", "tomato", "white_rice"], 1, 2, today),
      ],
      logs: [
        log(1, "breakfast", [typed("egg bhurji"), typed("roti")], today),
        log(1, "snack", [typed("dark chocolate")], today),
        log(2, "breakfast", [typed("boiled eggs"), typed("toast")], today),
        log(3, "snack", [typed("chips")], today),
      ],
      events: [
        ...purchaseHistory(["egg", "plain_yogurt", "onion", "tomato", "chicken_thigh", "spinach"], 3, today),
        { id: newId(), type: "swap", date: addDays(today, -5), mealName: "Chicken curry", foodId: "chicken_thigh" },
        { id: newId(), type: "accept", date: addDays(today, -3), mealName: "Palak paneer (shortcut)", foodId: "paneer" },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// Sofia — likes cooking, Mexican/Mediterranean, vegetarian + dairy-free,
// into nutrition (deep insights)
// ---------------------------------------------------------------------------

function sofiaLogs(today: IsoDate): LogEntry[] {
  // Six days of confirmed logs, newest first, so Insights has real patterns.
  // Breakfasts are light on protein: a pattern the insights should catch.
  const days: [MealSlot, LoggedItem[]][][] = [
    [
      ["breakfast", [typed("oats"), typed("frozen berries")]],
      ["lunch", [typed("quinoa"), typed("chickpeas"), typed("kale"), typed("tahini")]],
      ["dinner", [typed("corn tortillas"), typed("black beans"), typed("avocado"), typed("salsa")]],
    ],
    [
      // Batch-cooked the chili today (see pantry leftover, cooked 2 days ago).
      ["breakfast", [typed("oats"), typed("soy milk")]],
      ["lunch", [typed("black beans"), typed("sweet potato")]],
      ["dinner", [typed("black beans"), typed("corn tortillas")]],
    ],
    [
      ["breakfast", [typed("banana"), typed("soy milk")]],
      ["lunch", [typed("hummus"), typed("pita"), typed("cucumber")]],
      ["dinner", [typed("tofu"), typed("sweet potato"), typed("spinach")]],
      ["snack", [typed("pumpkin seeds")]],
    ],
    [
      ["breakfast", [typed("soy yogurt"), typed("frozen berries")]],
      ["lunch", [typed("red lentils"), typed("pita")]],
      ["dinner", [typed("quinoa"), typed("falafel"), typed("tahini")]],
    ],
    [
      ["breakfast", [typed("banana")]],
      ["lunch", [typed("chickpeas"), typed("cucumber"), typed("tomato")]],
      ["dinner", [typed("tofu"), typed("corn tortillas"), typed("salsa")]],
      ["snack", [typed("tortilla chips")]],
    ],
    [
      ["breakfast", [typed("oats"), typed("banana")]],
      ["lunch", [typed("black beans"), typed("brown rice"), typed("avocado")]],
      ["dinner", [typed("masoor dal"), typed("rice"), typed("spinach")]],
    ],
  ];

  return days.flatMap((meals, index) =>
    meals.map(([slot, items]) => log(index + 1, slot, items, today, "recap")),
  );
}

const sofia: Persona = {
  id: "sofia",
  name: "Sofia",
  emoji: "🌮",
  userType: "Likes cooking",
  tagline: "Vegetarian, dairy-free, batch-cooks on weekends, reads nutrition labels.",
  tests: "Diet restrictions (vegetarian + dairy-free) and deeper nutrition insights",
  build(today) {
    return {
      personaId: "sofia",
      profile: {
        ...PROFILE_DEFAULTS,
        name: "Sofia",
        effort: "likes_cooking",
        cuisines: ["mexican", "mediterranean"],
        diet: "vegetarian",
        avoidTags: ["dairy"],
        avoidFoods: [],
        weeklyLimits: [],
        weeklyBudget: 55,
        dayTypes: { mon: "busy", tue: "busy", wed: "packed", thu: "busy", fri: "free", sat: "free", sun: "free" },
        nutritionGoal: "more_protein",
        proteinTargetG: 75,
        insightDepth: "deep",
        askedAbout: ["budget", "nutritionGoal", "shoppingDay", "dayTypes"],
      },
      plan: null,
      groceryList: [],
      pantry: [
        leftover(
          "Black bean & sweet potato chili",
          ["black_beans", "sweet_potato", "onion", "canned_tomatoes", "cumin"],
          2, // 4-day leftover rule: good through tomorrow → heads-up
          2,
          today,
        ),
        bought("berries", 1, today, "fridge"),
        bought("kale", 2, today, "fridge"),
        bought("avocado", 2, today, "pantry"),
        bought("tofu", 3, today, "fridge"),
        bought("soy_milk", 5, today, "fridge", 2), // opened → lives in the fridge now
        bought("corn_tortilla", 5, today, "fridge"),
        bought("salsa", 10, today, "fridge", 6),
        bought("black_beans", 10, today, "pantry"),
        bought("chickpeas", 10, today, "pantry"),
        bought("quinoa", 14, today, "pantry"),
        bought("tahini", 14, today, "pantry", 10),
        bought("sweet_potato", 6, today, "pantry"),
      ],
      logs: sofiaLogs(today),
      events: [
        ...purchaseHistory(["black_beans", "corn_tortilla", "avocado", "kale", "tofu", "soy_milk"], 3, today),
        { id: newId(), type: "accept", date: addDays(today, -8), mealName: "Shakshuka-style chickpeas", foodId: "chickpeas" },
      ],
    };
  },
};

export const PERSONAS: Persona[] = [jae, arjun, sofia];

export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find((persona) => persona.id === id);
}
