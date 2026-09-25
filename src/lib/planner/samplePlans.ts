/**
 * Built-in sample weeks, used when there's no Gemini key or Gemini fails.
 *
 * Diet-aware: one template per demo persona style. For any user, code runs
 * EVERY template through the same safety gate (enforcePlan) and picks the
 * one that keeps the most meals, then the best effort/cuisine match. So a
 * vegetarian gets the plant-based week instead of a chicken week with holes.
 *
 * Templates respect shelf life: raw chicken only on the first two days,
 * berries by day 3, spinach by day 5, frozen/canned foods later in the week.
 * (Phase 10 replaces these with a larger tagged meal library.)
 */
import type { Cuisine, EffortLevel, FoodId, Meal, MealSlot, WeekPlan } from "@/lib/types";
import { enforcePlan, type EnforcedPlan } from "@/lib/safety/verify";
import { toVerifyContext, type PlanDay, type PlanRequest } from "./context";

interface TemplateMeal {
  slot: MealSlot;
  name: string;
  foods: FoodId[];
  prep: number;
  portions?: number;
  /** Name this meal so leftovers can point at it. */
  key?: string;
  /** This meal is leftovers of the meal with this key. */
  leftoverOf?: string;
  isNew?: boolean;
}

interface Template {
  id: string;
  effort: EffortLevel;
  cuisines: Cuisine[];
  days: TemplateMeal[][];
}

const b = (name: string, foods: FoodId[], prep = 5): TemplateMeal => ({ slot: "breakfast", name, foods, prep });
const l = (name: string, foods: FoodId[], prep = 10, extra: Partial<TemplateMeal> = {}): TemplateMeal => ({ slot: "lunch", name, foods, prep, ...extra });
const d = (name: string, foods: FoodId[], prep = 20, extra: Partial<TemplateMeal> = {}): TemplateMeal => ({ slot: "dinner", name, foods, prep, ...extra });
const s = (name: string, foods: FoodId[]): TemplateMeal => ({ slot: "snack", name, foods, prep: 1 });

// ---------------------------------------------------------------- Zero-cook, Korean/American
const READY_MADE: Template = {
  id: "ready",
  effort: "zero_cook",
  cuisines: ["korean", "american"],
  days: [
    [b("Greek yogurt + strawberries", ["greek_yogurt", "berries"]), l("Rotisserie chicken wrap", ["rotisserie_chicken", "flour_tortilla", "bagged_salad"], 5), d("Microwave mandu + side salad", ["frozen_pork_dumplings", "bagged_salad", "soy_sauce"], 10), s("Seaweed snacks", ["seaweed_snack"])],
    [b("Toasted bagel + banana", ["bagel", "banana"], 3), l("Rotisserie chicken kimchi rice bowl", ["rotisserie_chicken", "microwave_rice", "cucumber", "kimchi"], 5), d("Frozen pizza + baby carrots", ["frozen_pizza", "baby_carrots"], 15), s("Apple", ["apple"])],
    [b("Greek yogurt + strawberries", ["greek_yogurt", "berries"]), l("Turkey + lettuce sandwich", ["deli_turkey", "whole_wheat_bread", "romaine"], 4), d("Ramen loaded with frozen veggies", ["instant_ramen", "frozen_mixed_veg"], 8), s("Popcorn", ["popcorn"])],
    [b("Toasted bagel + banana", ["bagel", "banana"], 3), l("Kimbap + edamame", ["frozen_kimbap", "edamame"], 6), d("Bean burrito + salsa + avocado", ["frozen_burrito", "salsa", "avocado"], 5), s("Seaweed snacks", ["seaweed_snack"])],
    [b("Greek yogurt + banana", ["greek_yogurt", "banana"]), l("Tuna kimchi rice bowl", ["canned_tuna", "microwave_rice", "cucumber", "kimchi"], 5), d("Veggie dumplings + edamame", ["frozen_veggie_dumplings", "edamame"], 10), s("Apple", ["apple"])],
    [b("Greek yogurt + frozen berries", ["greek_yogurt", "frozen_berries"]), l("Turkey wrap", ["deli_turkey", "flour_tortilla", "romaine"], 4), d("Mandu + baby carrots", ["frozen_pork_dumplings", "baby_carrots"], 10), s("Popcorn", ["popcorn"])],
    [b("Greek yogurt + frozen berries", ["greek_yogurt", "frozen_berries"]), l("Kimbap + cucumber", ["frozen_kimbap", "cucumber"], 4), d("Pizza night + side salad", ["frozen_pizza", "romaine"], 15), s("Seaweed snacks", ["seaweed_snack"])],
  ],
};

// ---------------------------------------------------------------- Minimal cook, North Indian
const CURRY: TemplateMeal["foods"] = ["chicken_thigh", "onion", "tomato", "ginger", "garam_masala", "white_rice"];
const DAL: TemplateMeal["foods"] = ["toor_dal", "tomato", "onion", "cumin", "white_rice"];

const HOME_STYLE: Template = {
  id: "home",
  effort: "minimal_cook",
  cuisines: ["indian"],
  days: [
    [b("Egg bhurji + roti", ["egg", "onion", "green_chili", "frozen_roti"], 10), l("Masala chickpea rice bowl", ["chickpeas", "onion", "tomato", "white_rice", "cumin"], 15), d("Chicken curry (cook once, eat 3x)", CURRY, 35, { portions: 3, key: "curry" }), s("Roasted makhana", ["makhana"])],
    [b("Dahi + banana", ["plain_yogurt", "banana"], 2), l("Chicken curry (leftovers)", CURRY, 3, { leftoverOf: "curry" }), d("Shortcut palak paneer + roti", ["paneer", "spinach", "onion", "garlic", "frozen_roti"], 20), s("Apple", ["apple"])],
    [b("Masala oats", ["oats", "onion", "frozen_peas", "green_chili"], 8), l("Chicken curry (leftovers)", CURRY, 3, { leftoverOf: "curry" }), d("Toor dal + rice (makes 2)", DAL, 25, { portions: 2, key: "dal" }), s("Dark chocolate square", ["dark_chocolate"])],
    [b("Egg bhurji + roti", ["egg", "onion", "green_chili", "frozen_roti"], 10), l("Dal rice (leftovers)", DAL, 3, { leftoverOf: "dal" }), d("Paneer bhurji wrap", ["paneer", "bell_pepper", "onion", "flour_tortilla"], 15, { isNew: true }), s("Roasted makhana", ["makhana"])],
    [b("Dahi + banana", ["plain_yogurt", "banana"], 2), l("Chana chaat", ["chickpeas", "cucumber", "tomato", "lemon"], 8), d("Aloo matar + roti", ["potato", "frozen_peas", "onion", "frozen_roti"], 25), s("Apple", ["apple"])],
    [b("Masala oats", ["oats", "onion", "frozen_peas", "green_chili"], 8), l("Rajma rice bowl", ["kidney_beans", "onion", "canned_tomatoes", "white_rice"], 15), d("Egg curry + rice", ["egg", "onion", "canned_tomatoes", "garam_masala", "white_rice"], 20), s("Dark chocolate square", ["dark_chocolate"])],
    [b("Dahi + frozen berries", ["plain_yogurt", "frozen_berries"], 2), l("Chana masala + roti", ["chickpeas", "canned_tomatoes", "onion", "frozen_roti"], 15), d("Masoor dal tadka + rice", ["red_lentils", "onion", "canned_tomatoes", "cumin", "white_rice"], 25), s("Roasted makhana", ["makhana"])],
  ],
};

// ---------------------------------------------------------------- Likes cooking, plant-based Mexican/Mediterranean
const CHILI: TemplateMeal["foods"] = ["black_beans", "kidney_beans", "canned_tomatoes", "onion", "bell_pepper", "cumin", "olive_oil"];
const SOUP: TemplateMeal["foods"] = ["red_lentils", "onion", "canned_tomatoes", "cumin", "olive_oil"];

const PLANT_BASED: Template = {
  id: "plant",
  effort: "likes_cooking",
  cuisines: ["mexican", "mediterranean", "middle_eastern"],
  days: [
    [b("Oats with strawberries + soy milk", ["oats", "berries", "soy_milk"]), l("Black bean tacos", ["black_beans", "corn_tortilla", "salsa", "avocado", "lime"], 12), d("Big-batch veggie chili", CHILI, 40, { portions: 3, key: "chili" }), s("Apple + pumpkin seeds", ["apple", "pumpkin_seeds"])],
    [b("Spinach tofu scramble", ["tofu", "spinach", "onion", "olive_oil"], 12), l("Veggie chili (leftovers)", CHILI, 3, { leftoverOf: "chili" }), d("Falafel pita + hummus", ["frozen_falafel", "pita", "hummus", "cucumber", "tomato"], 15), s("Baby carrots + hummus", ["baby_carrots", "hummus"])],
    [b("Soy yogurt + strawberries", ["soy_yogurt", "berries"], 2), l("Quinoa chickpea salad", ["quinoa", "chickpeas", "cucumber", "tomato", "lemon", "olive_oil"], 20), d("Veggie chili (leftovers)", CHILI, 3, { leftoverOf: "chili" }), s("Apple + pumpkin seeds", ["apple", "pumpkin_seeds"])],
    [b("Oats + banana + soy milk", ["oats", "banana", "soy_milk"]), l("Hummus veggie wrap", ["hummus", "flour_tortilla", "bell_pepper", "spinach"], 8), d("Sweet potato black bean bowl", ["sweet_potato", "black_beans", "brown_rice", "salsa", "avocado"], 30), s("Baby carrots + hummus", ["baby_carrots", "hummus"])],
    [b("Tofu scramble tacos", ["tofu", "corn_tortilla", "salsa"], 12), l("Red lentil soup (makes 2)", SOUP, 30, { portions: 2, key: "soup" }), d("Tofu veggie stir-fry", ["tofu", "frozen_mixed_veg", "soy_sauce", "garlic", "brown_rice"], 20), s("Apple + pumpkin seeds", ["apple", "pumpkin_seeds"])],
    [b("Oats + frozen berries + soy milk", ["oats", "frozen_berries", "soy_milk"]), l("Red lentil soup (leftovers)", SOUP, 3, { leftoverOf: "soup" }), d("Chickpea shawarma bowl", ["chickpeas", "couscous", "cucumber", "tahini", "lemon"], 25, { isNew: true }), s("Baby carrots + hummus", ["baby_carrots", "hummus"])],
    [b("Soy yogurt + frozen berries", ["soy_yogurt", "frozen_berries"], 2), l("Burrito bowl", ["black_beans", "brown_rice", "salsa", "romaine", "lime"], 15), d("Garlicky tomato couscous + chickpeas", ["couscous", "canned_tomatoes", "garlic", "chickpeas", "frozen_broccoli", "olive_oil"], 20), s("Apple + pumpkin seeds", ["apple", "pumpkin_seeds"])],
  ],
};

export const SAMPLE_TEMPLATES: Template[] = [READY_MADE, HOME_STYLE, PLANT_BASED];

export function templateToPlan(template: Template, days: readonly PlanDay[], planId: string, createdAt: string): WeekPlan {
  const idFor = (dayIndex: number, slot: MealSlot) => `${planId}-${template.id}-d${dayIndex}-${slot}`;
  const keyToId = new Map<string, string>();
  template.days.forEach((meals, i) => meals.forEach((m) => m.key && keyToId.set(m.key, idFor(i, m.slot))));

  return {
    id: planId,
    startDate: days[0].date,
    createdAt,
    source: "fallback",
    days: days.map((day, i) => ({
      date: day.date,
      dayType: day.dayType,
      meals: (template.days[i] ?? []).map(
        (m): Meal => ({
          id: idFor(i, m.slot),
          slot: m.slot,
          name: m.name,
          items: m.foods.map((foodId) => ({ foodId, servings: 1 })),
          prepMinutes: m.prep,
          effort: template.effort,
          portions: m.portions ?? 1,
          ...(m.leftoverOf && { leftoverOf: keyToId.get(m.leftoverOf) }),
          recipeQuery: m.name.replace(/\(.*?\)/g, "").trim(),
          isNew: m.isNew ?? false,
        }),
      ),
    })),
  };
}

/** Every template candidate for a slot, used when regenerating one meal without AI. */
export function sampleMealsForSlot(slot: MealSlot): { template: Template; meal: TemplateMeal }[] {
  return SAMPLE_TEMPLATES.flatMap((template) =>
    template.days.flat().filter((m) => m.slot === slot && !m.leftoverOf).map((meal) => ({ template, meal })),
  );
}

export function templateMealToMeal(template: Template, meal: TemplateMeal, id: string): Meal {
  return {
    id,
    slot: meal.slot,
    name: meal.name.replace(/\s*\(.*?\)/g, ""),
    items: meal.foods.map((foodId) => ({ foodId, servings: 1 })),
    prepMinutes: meal.prep,
    effort: template.effort,
    portions: 1,
    recipeQuery: meal.name.replace(/\(.*?\)/g, "").trim(),
    isNew: false,
  };
}

export interface SamplePick extends EnforcedPlan {
  templateId: string;
}

/** Try every template against this user's safety rules; keep the one that fits best. */
export function pickSamplePlan(req: PlanRequest, days: readonly PlanDay[], planId: string, createdAt: string): SamplePick {
  const ctx = toVerifyContext(req);
  let best: (SamplePick & { score: number }) | null = null;

  for (const template of SAMPLE_TEMPLATES) {
    const enforced = enforcePlan(templateToPlan(template, days, planId, createdAt), ctx);
    const kept = enforced.plan.days.reduce((sum, day) => sum + day.meals.length, 0);
    const fit =
      (template.effort === req.profile.effort ? 0.5 : 0) +
      template.cuisines.filter((c) => req.profile.cuisines.includes(c)).length * 0.25;
    const score = kept + fit;
    if (!best || score > best.score) best = { ...enforced, templateId: template.id, score };
  }

  const { plan, removed, warnings, templateId } = best!;
  return { plan, removed, warnings, templateId };
}
