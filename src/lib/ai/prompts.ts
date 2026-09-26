/**
 * Prompts are written by CODE from verified facts. The AI plans; it never
 * decides what's safe.
 *
 * What goes in:  effort level, cuisines, day types, allowed foods (avoids
 *                already removed), kitchen items still good (soonest first),
 *                recent limit counts, budget, learned patterns.
 * What stays out: the user's name, and anything they avoid (the AI never
 *                sees those foods, so it can't pick them).
 */
import { FOOD_LIST, getFood } from "@/lib/data/foods";
import { AVOID_OPTIONS, CUISINE_OPTIONS, EFFORT_OPTIONS } from "@/lib/data/labels";
import { shortDayName } from "@/lib/dates";
import { effectiveAvoidTags, isFoodAllowed } from "@/lib/safety/allergens";
import { expiresOn } from "@/lib/safety/expiry";
import { isGroupTag } from "@/lib/data/tagGroups";
import { formatUsd } from "@/lib/safety/budget";
import { summarizeRecentBehavior } from "@/lib/insights/eventSummary";
import type { FoodId, IsoDate, MealSlot, Profile } from "@/lib/types";
import { limitStatus, pantryForPlanning, type PlanDay, type PlanRequest } from "@/lib/planner/context";

/** Catalog foods this user may be offered: hard avoids and avoided foods removed. */
export function allowedFoodIds(profile: Profile): FoodId[] {
  const avoid = effectiveAvoidTags(profile);
  return FOOD_LIST.filter(([id]) => isFoodAllowed(id, avoid, profile.avoidFoods)).map(([id]) => id);
}

const DAY_TYPE_GUIDE = {
  packed: "packed: grab-and-go only, 10 minutes or less per meal",
  busy: "busy: quick meals, 20 minutes or less",
  free: "free: time to cook; a good day for a batch dish that covers 2–3 later meals",
  out: "out: eating out for lunch and dinner; plan breakfast (and a snack if useful) only",
} as const;

const EFFORT_GUIDE = {
  zero_cook: "ZERO-COOK: never ask them to cook. Ready-made, frozen, microwave, and assembly meals only.",
  minimal_cook: "MINIMAL COOK: short, simple cooking. Use batch cooking (cook once, eat 2–3 times) on free days.",
  likes_cooking: "LIKES COOKING: real recipes are welcome, especially batch dishes on free days.",
} as const;

/** One compact entry per food, with its package so the AI can plan to use packages up. */
function foodLines(ids: readonly FoodId[]): string {
  return ids
    .map((id) => {
      const food = getFood(id);
      const buy = food.staple ? "staple, already at home" : `${formatUsd(food.price.cost)} buys ${food.price.servings} servings`;
      return `${id} (${food.name}, ${food.role}, ${buy})`;
    })
    .join("; ");
}

function kitchenLines(req: PlanRequest, startDate: IsoDate): string[] {
  return pantryForPlanning(req.pantry, startDate)
    .map((item) => ({ item, useBy: expiresOn(item) }))
    .sort((a, b) => a.useBy.localeCompare(b.useBy))
    .map(({ item, useBy }) =>
      item.kind === "grocery"
        ? `- pantryItemId ${item.id}: ${getFood(item.foodId).name} (${item.foodId}), good through ${useBy}`
        : `- leftover id ${item.id}: "${item.mealName}", ${item.portionsLeft} portion(s), good through ${useBy} (set leftoverOf to this id)`,
    );
}

function limitLines(req: PlanRequest, startDate: IsoDate): string[] {
  return limitStatus(req.logs, req.profile.weeklyLimits, startDate).map(({ limit, recentDates }) => {
    const label = AVOID_OPTIONS[limit.tag].label.toLowerCase();
    const group = isGroupTag(limit.tag) ? " (all kinds counted together)" : "";
    const recent = recentDates.length ? ` Already eaten in the days before the plan: ${recentDates.length} (on ${recentDates.join(", ")}).` : "";
    return `- ${label}${group}: at most ${limit.maxPerWeek} meals in ANY 7 days in a row.${recent} Spread them out.`;
  });
}

function sharedContext(req: PlanRequest, startDate: IsoDate): string {
  const { profile } = req;
  const allowed = allowedFoodIds(profile);
  const kitchen = kitchenLines(req, startDate);
  const limits = limitLines(req, startDate);
  const patterns = summarizeRecentBehavior(req.events, req.logs, req.today);

  return [
    `EFFORT: ${EFFORT_GUIDE[profile.effort]} (${EFFORT_OPTIONS[profile.effort].label})`,
    `CUISINES THEY KNOW: ${profile.cuisines.map((c) => CUISINE_OPTIONS[c].label).join(", ")}. Most meals should come from these.`,
    `GOAL: ${profile.nutritionGoal.replace("_", " ")}; about ${profile.proteinTargetG} g protein a day.`,
    `BUDGET: ${formatUsd(profile.weeklyBudget)} for the WHOLE week of groceries. Groceries come in whole packages (see "buys N servings"), so keep the shopping list short.`,
    "",
    "ALLOWED FOODS (use ONLY these ids as ingredients; nothing else exists):",
    foodLines(allowed),
    "",
    kitchen.length
      ? ["ALREADY IN THEIR KITCHEN (use these first, before they go bad; set pantryItemId when you use one):", ...kitchen].join("\n")
      : "KITCHEN: nothing useful at home yet.",
    limits.length ? ["", "WEEKLY LIMITS (allergy reasons, strict):", ...limits].join("\n") : "",
    patterns.length ? ["", "WHAT WE KNOW FROM THEIR RECENT WEEKS:", ...patterns.map((l) => `- ${l}`)].join("\n") : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

const PLAN_RULES = `RULES
1. Every ingredient must be an id from ALLOWED FOODS. Include sauces, oils, and condiments as ingredients too, so they can be safety-checked.
2. Ingredients describe ONE portion. For a batch dish set portions (2–3); later meals that eat it get leftoverOf = its id, the same ingredients, and must be within 3 days after it's cooked.
3. Fresh raw meat, poultry, and fish keep only 1–2 days: use them on the first 1–2 days of the week, or use frozen/canned options later. Eggs and dairy keep longer.
4. Use kitchen items before their "good through" date.
5. Familiar first: at most ONE meal with isNew = true, one small step from what they already eat.
6. Healthy but realistic: protein in most meals, a fruit or vegetable most days. Snacks are fine; make them better choices (e.g. roasted chickpeas instead of chips).
7. Meal names are specific and appetizing. recipeQuery = a few search words for a recipe video.
8. prepMinutes must fit the day type and effort level.
9. BUDGET: build the week around a SHORT shopping list. Reuse the same few proteins, grains, and vegetables across several meals so every package gets used up (a dozen eggs = 6 servings; a bag of rice lasts all week). Avoid ingredients used only once. Staples marked "already at home" cost nothing.`;

export function buildPlanPrompt(req: PlanRequest, days: readonly PlanDay[], problems: readonly string[] = []): string {
  const startDate = days[0].date;
  const dayLines = days.map((d) => `- ${d.date} (${shortDayName(d.date)}): ${DAY_TYPE_GUIDE[d.dayType]}`);

  return [
    "You are FuelUp's meal planner for an off-campus college student in the US.",
    "Plan breakfast, lunch, and dinner (plus at most one snack) for each of these days:",
    ...dayLines,
    "",
    sharedContext(req, startDate),
    "",
    PLAN_RULES,
    problems.length
      ? [
          "",
          "YOUR PREVIOUS PLAN HAD THESE PROBLEMS. Return a corrected FULL plan that fixes every one:",
          ...problems.map((p) => `- ${p}`),
        ].join("\n")
      : "",
    "",
    "Return JSON only, matching the schema. Use each date exactly as given.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export interface SingleMealAsk {
  date: IsoDate;
  slot: MealSlot;
  dayType: PlanDay["dayType"];
  /** Why the previous option was removed, or problems with the last attempt. */
  problems: string[];
  /** Other meals already planned that week, for variety and limit-awareness. */
  otherMeals: string[];
}

export function buildMealPrompt(req: PlanRequest, ask: SingleMealAsk): string {
  return [
    "You are FuelUp's meal planner for an off-campus college student in the US.",
    `Suggest ONE ${ask.slot} for ${ask.date} (${shortDayName(ask.date)}): ${DAY_TYPE_GUIDE[ask.dayType]}.`,
    "",
    sharedContext(req, ask.date),
    "",
    PLAN_RULES,
    ask.otherMeals.length ? ["", "ALREADY PLANNED THIS WEEK (don't repeat; mind the weekly limits):", ...ask.otherMeals.map((m) => `- ${m}`)].join("\n") : "",
    ask.problems.length ? ["", "THE PREVIOUS OPTION FOR THIS SLOT HAD THESE PROBLEMS. Avoid them:", ...ask.problems.map((p) => `- ${p}`)].join("\n") : "",
    "",
    `Return JSON only: one meal with slot "${ask.slot}" and portions 1.`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
