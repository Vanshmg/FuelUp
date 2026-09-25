/**
 * What the browser sends to the server to plan a week, and the facts code
 * derives from it before anything goes to the AI.
 *
 * The server never stores anything: it gets this context, plans, verifies,
 * and returns. (Storage lives in the browser; see lib/storage.)
 */
import { z } from "zod";
import { addDays, daysBetween, weekdayOf } from "@/lib/dates";
import { logHasTag, WINDOW_DAYS } from "@/lib/safety/limits";
import { usablePantry } from "@/lib/safety/expiry";
import {
  EventSchema,
  IsoDateSchema,
  LogEntrySchema,
  PantryItemSchema,
  ProfileSchema,
  type DayType,
  type IsoDate,
  type LogEntry,
  type PantryItem,
  type Profile,
  type WeeklyLimit,
} from "@/lib/types";
import type { VerifyContext } from "@/lib/safety/verify";

export const PLAN_DAYS = 7;

/** Validated on the server: the browser is not trusted blindly. */
export const PlanRequestSchema = z.object({
  profile: ProfileSchema,
  pantry: z.array(PantryItemSchema).max(300),
  logs: z.array(LogEntrySchema).max(2000),
  events: z.array(EventSchema).max(1000),
  /** The user's local date (the server's clock may be in another time zone). */
  today: IsoDateSchema,
});
export type PlanRequest = z.infer<typeof PlanRequestSchema>;

export function toVerifyContext(req: PlanRequest): VerifyContext {
  return { profile: req.profile, pantry: req.pantry, logs: req.logs, today: req.today };
}

export interface PlanDay {
  date: IsoDate;
  dayType: DayType;
}

/** The plan covers 7 days starting TOMORROW (FuelUp asks about tomorrow, not yesterday). */
export function planDays(profile: Profile, today: IsoDate): PlanDay[] {
  return Array.from({ length: PLAN_DAYS }, (_, i) => {
    const date = addDays(today, i + 1);
    return { date, dayType: profile.dayTypes[weekdayOf(date)] };
  });
}

/** Pantry items still good at the plan's start, soonest-to-expire first. */
export function pantryForPlanning(pantry: readonly PantryItem[], startDate: IsoDate): PantryItem[] {
  return usablePantry(pantry, startDate);
}

export interface LimitStatus {
  limit: WeeklyLimit;
  /** Dates of meals with this tag already eaten in the 6 days before the plan starts. */
  recentDates: IsoDate[];
}

/**
 * For the prompt: which limited meals were eaten just before the plan, so
 * the AI can spread the rest out. Code still re-counts everything in
 * verifyPlan; this is guidance, not the check.
 */
export function limitStatus(logs: readonly LogEntry[], limits: readonly WeeklyLimit[], startDate: IsoDate): LimitStatus[] {
  return limits.map((limit) => ({
    limit,
    recentDates: logs
      .filter((entry) => {
        const daysBefore = daysBetween(entry.date, startDate);
        return daysBefore >= 1 && daysBefore < WINDOW_DAYS && logHasTag(entry, limit.tag);
      })
      .map((entry) => entry.date)
      .sort(),
  }));
}
