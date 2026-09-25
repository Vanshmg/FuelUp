/**
 * Small derived values the UI needs, computed from saved state by code.
 * Pure functions: easy to test, never stored.
 */
import { lastWeekdayOnOrBefore } from "@/lib/dates";
import { budgetStatus, spentThisWeek, type BudgetStatus } from "@/lib/safety/budget";
import type { IsoDate, PantryItem, Profile } from "@/lib/types";

/**
 * The header's budget chip: weekly grocery budget minus what was actually
 * paid since the last shopping day.
 */
export function weeklyBudgetStatus(profile: Profile, pantry: readonly PantryItem[], today: IsoDate): BudgetStatus {
  const weekStart = lastWeekdayOnOrBefore(today, profile.shoppingDay);
  return budgetStatus(profile.weeklyBudget, spentThisWeek(pantry, today, weekStart));
}
