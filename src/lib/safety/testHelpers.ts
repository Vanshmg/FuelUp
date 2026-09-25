/** Tiny builders so safety tests read like scenarios. Test-only. */
import { addDays } from "@/lib/dates";
import { PROFILE_DEFAULTS } from "@/lib/data/defaults";
import type { FoodId, IsoDate, LogEntry, Meal, MealSlot, Profile, WeekPlan } from "@/lib/types";

let counter = 0;

export function meal(name: string, foods: FoodId[], overrides: Partial<Meal> = {}): Meal {
  counter += 1;
  return {
    id: `m${counter}`,
    slot: "dinner",
    name,
    items: foods.map((foodId) => ({ foodId, servings: 1 })),
    prepMinutes: 10,
    effort: "minimal_cook",
    portions: 1,
    isNew: false,
    ...overrides,
  };
}

/** A plan starting on `start`, with the given meals on day offsets 0, 1, 2… */
export function planFrom(start: IsoDate, days: Meal[][]): WeekPlan {
  return {
    id: "plan",
    startDate: start,
    createdAt: `${start}T08:00:00.000Z`,
    source: "ai",
    days: days.map((meals, offset) => ({ date: addDays(start, offset), dayType: "busy", meals })),
  };
}

export function logged(date: IsoDate, slot: MealSlot, foods: FoodId[], label = foods.join(" + ")): LogEntry {
  counter += 1;
  return {
    id: `l${counter}`,
    date,
    slot,
    source: "quick_log",
    items: foods.length
      ? foods.map((foodId) => ({ foodId, label, servings: 1 }))
      : [{ label, servings: 1, estimate: { kcal: 400, protein: 15, carbs: 40, fat: 15 } }],
  };
}

export function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    ...PROFILE_DEFAULTS,
    effort: "minimal_cook",
    cuisines: ["american"],
    diet: "none",
    avoidTags: [],
    avoidFoods: [],
    weeklyLimits: [],
    weeklyBudget: 500,
    ...overrides,
  };
}
