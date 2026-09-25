/**
 * Sensible defaults for everything onboarding doesn't ask.
 * Each one is asked later, one at a time, when it becomes relevant.
 */
import type { DayType, Profile, Weekday } from "@/lib/types";

export const DEFAULT_DAY_TYPES: Record<Weekday, DayType> = {
  mon: "busy",
  tue: "busy",
  wed: "busy",
  thu: "busy",
  fri: "out",
  sat: "free",
  sun: "free",
};

export const PROFILE_DEFAULTS = {
  weeklyBudget: 50,
  shoppingDay: "sun",
  dayTypes: DEFAULT_DAY_TYPES,
  nutritionGoal: "balanced",
  proteinTargetG: 70,
  insightDepth: "casual",
  askedAbout: [],
} satisfies Partial<Profile>;
