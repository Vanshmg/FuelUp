/**
 * What the safety check reports.
 *
 * Every problem is a SafetyIssue with a severity:
 * - "block": the meal is never shown. After the AI retry, it's removed and
 *   replaced (allergens, unknown ingredients, weekly limits, expired food).
 * - "warn": shown with a visible warning (budget, freshness timing).
 *
 * Both kinds are sent back to the AI in the one automatic retry. The message
 * is written for humans, so the same text works for the AI and the UI.
 */
import type { AvoidTag, FoodId, IsoDate, MealSlot } from "@/lib/types";

export type IssueCode =
  | "hard_avoid" // an ingredient contains something the user never eats
  | "may_contain" // an ingredient may contain it (brand / cross-contact)
  | "avoid_food" // the user avoids this specific food
  | "name_mentions" // the meal name mentions an avoided food ("French toast")
  | "unknown_ingredient" // not in the catalog, so it can't be checked
  | "weekly_limit" // would exceed a weekly limit in a rolling 7-day window
  | "expired" // uses a pantry item past its use-by date on that day
  | "leftover_too_old" // leftovers past the 4-day rule
  | "leftover_unknown" // leftovers we can't trace to a cook date
  | "not_enough_leftovers" // more leftover meals than portions cooked
  | "perishable_late" // bought on shopping day but eaten after it would go bad
  | "too_many_new" // more than one new dish this week
  | "over_budget"; // plan's estimated grocery cost is over the weekly budget

export type Severity = "block" | "warn";

const SEVERITY: Record<IssueCode, Severity> = {
  hard_avoid: "block",
  may_contain: "block",
  avoid_food: "block",
  name_mentions: "block",
  unknown_ingredient: "block",
  weekly_limit: "block", // limits exist for allergy reasons, so they block
  expired: "block",
  leftover_too_old: "block",
  leftover_unknown: "block",
  not_enough_leftovers: "warn",
  perishable_late: "warn",
  too_many_new: "warn",
  over_budget: "warn",
};

export interface SafetyIssue {
  code: IssueCode;
  severity: Severity;
  message: string;
  mealId?: string;
  date?: IsoDate;
  slot?: MealSlot;
  foodId?: FoodId;
  tag?: AvoidTag;
}

export function makeIssue(
  code: IssueCode,
  message: string,
  details: Omit<SafetyIssue, "code" | "severity" | "message"> = {},
): SafetyIssue {
  return { code, severity: SEVERITY[code], message, ...details };
}

export const TAG_LABELS: Record<AvoidTag, string> = {
  peanut: "peanuts",
  tree_nut: "tree nuts",
  dairy: "dairy",
  egg: "egg",
  soy: "soy",
  wheat: "wheat",
  fish: "fish",
  shellfish: "shellfish",
  sesame: "sesame",
  chocolate: "chocolate",
  poultry: "poultry",
  beef: "beef",
  pork: "pork",
  lamb: "lamb",
};
