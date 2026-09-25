/**
 * Local calendar-date helpers. FuelUp works in "YYYY-MM-DD" strings so that
 * "today", "tomorrow", and expiry days never shift with time zones.
 * (Phase 3 extends this file and adds full tests.)
 */
import type { IsoDate, Weekday } from "@/lib/types";
import { WEEKDAYS } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Today in the user's local time zone. */
export function todayIso(now: Date = new Date()): IsoDate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Parse "YYYY-MM-DD" as a local date at noon (noon avoids DST edge cases). */
function toLocalDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = toLocalDate(iso);
  date.setDate(date.getDate() + days);
  return todayIso(date);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toLocalDate(to).getTime() - toLocalDate(from).getTime()) / 86_400_000);
}

export function weekdayOf(iso: IsoDate): Weekday {
  // getDay(): 0 = Sunday. WEEKDAYS starts on Monday.
  return WEEKDAYS[(toLocalDate(iso).getDay() + 6) % 7];
}

/** "Tue" — for friendly messages like "Tue lunch". */
export function shortDayName(iso: IsoDate): string {
  const day = weekdayOf(iso);
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a < b ? a : b;
}
