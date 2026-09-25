/**
 * Weekly limits, e.g. "eggs max 4x per week".
 *
 * These exist for allergy reasons, so the counting is strict:
 *
 * 1. ROLLING 7-DAY WINDOW, not a calendar week. Every run of 7 consecutive
 *    days must stay within the limit. (With calendar weeks, eggs twice on
 *    Friday plus 4 times Sat–Tue = 6 in 5 days would pass.)
 * 2. A meal counts once per limit, however many egg ingredients it has.
 * 3. What counts as eaten on a day, per meal slot:
 *    - a LOGGED meal always counts (it replaces the plan for that slot);
 *    - a PLANNED meal on a past day with nothing logged counts as eaten
 *      ("assumed": the plan happened unless told otherwise);
 *    - a planned meal today or later is a CANDIDATE: it's checked, and if it
 *      would break the limit, it's flagged.
 * 4. A meal counts if an ingredient CONTAINS the tag, or its name / logged
 *    label mentions it ("masala omelette"). "May contain" does not count
 *    toward limits (it would make every slice of bread an egg meal); it does
 *    block hard avoids.
 *
 * Candidates are checked in time order, so the earliest meals are kept and
 * the later ones that would push over the limit are flagged.
 */
import { addDays } from "@/lib/dates";
import { getFood } from "@/lib/data/foods";
import { expandTags } from "@/lib/data/tagGroups";
import type { AvoidTag, IsoDate, LogEntry, Meal, MealSlot, WeekPlan, WeeklyLimit } from "@/lib/types";
import { describePlace, tagsInText } from "./allergens";
import { makeIssue, TAG_LABELS, type SafetyIssue } from "./issues";

export const WINDOW_DAYS = 7;

const SLOT_ORDER: Record<MealSlot, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

/** Does this food contain the tag? A group tag (poultry) matches any member. */
function containsTag(foodId: Meal["items"][number]["foodId"], tag: AvoidTag): boolean {
  const members = expandTags([tag]);
  return getFood(foodId).contains.some((t) => members.includes(t));
}

export function mealHasTag(meal: Pick<Meal, "name" | "items" | "recipeQuery">, tag: AvoidTag): boolean {
  if (meal.items.some((item) => containsTag(item.foodId, tag))) return true;
  return tagsInText(`${meal.name} ${meal.recipeQuery ?? ""}`, [tag]).length > 0;
}

export function logHasTag(entry: LogEntry, tag: AvoidTag): boolean {
  return entry.items.some(
    (item) =>
      (item.foodId !== undefined && containsTag(item.foodId, tag)) || tagsInText(item.label, [tag]).length > 0,
  );
}

/** How many dates in `dates` fall within the 7-day window starting at `start`. */
function countInWindow(dates: readonly IsoDate[], start: IsoDate): number {
  const end = addDays(start, WINDOW_DAYS - 1);
  return dates.filter((date) => date >= start && date <= end).length;
}

/**
 * The most meals with this tag in any 7-day window that contains `date`,
 * if one more were eaten on `date`.
 */
function worstWindowWith(dates: readonly IsoDate[], date: IsoDate): number {
  let worst = 0;
  for (let offset = WINDOW_DAYS - 1; offset >= 0; offset--) {
    worst = Math.max(worst, countInWindow(dates, addDays(date, -offset)) + 1);
  }
  return worst;
}

interface PlannedMeal {
  date: IsoDate;
  meal: Meal;
}

export function checkWeeklyLimits(
  plan: WeekPlan,
  logs: readonly LogEntry[],
  limits: readonly WeeklyLimit[],
  today: IsoDate,
): SafetyIssue[] {
  const loggedSlots = new Set(logs.map((entry) => `${entry.date}|${entry.slot}`));
  const plannedMeals: PlannedMeal[] = plan.days
    .flatMap((day) => day.meals.map((meal) => ({ date: day.date, meal })))
    .sort((a, b) => a.date.localeCompare(b.date) || SLOT_ORDER[a.meal.slot] - SLOT_ORDER[b.meal.slot]);

  const issues: SafetyIssue[] = [];

  for (const { tag, maxPerWeek } of limits) {
    // Dates of meals with this tag that are already eaten (logged or assumed).
    const eaten: IsoDate[] = logs.filter((entry) => logHasTag(entry, tag)).map((entry) => entry.date);
    const candidates: PlannedMeal[] = [];

    for (const planned of plannedMeals) {
      if (loggedSlots.has(`${planned.date}|${planned.meal.slot}`)) continue; // the log replaced it
      if (!mealHasTag(planned.meal, tag)) continue;
      if (planned.date < today) eaten.push(planned.date); // assumed eaten
      else candidates.push(planned);
    }

    for (const { date, meal } of candidates) {
      const count = worstWindowWith(eaten, date);
      if (count > maxPerWeek) {
        issues.push(
          makeIssue(
            "weekly_limit",
            `${describePlace({ date, slot: meal.slot })}: "${meal.name}" would make ${count} ${TAG_LABELS[tag]} meals ` +
              `in 7 days (your limit is ${maxPerWeek}).`,
            { mealId: meal.id, date, slot: meal.slot, tag },
          ),
        );
      } else {
        eaten.push(date); // kept, so it counts toward later meals
      }
    }
  }
  return issues;
}
