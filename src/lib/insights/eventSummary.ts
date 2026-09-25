/**
 * How the app "learns": Gemini never changes, so code summarizes what the
 * user actually did (recent weeks, not all-time) into a few plain lines that
 * go into each prompt.
 *
 * e.g. "Buys weekly: Greek yogurt, bananas. Said no to: Overnight oats (2x).
 *       Often eats: chips, kimchi."
 */
import { addDays } from "@/lib/dates";
import { getFood } from "@/lib/data/foods";
import type { AppEvent, FoodId, IsoDate, LogEntry } from "@/lib/types";

export const SUMMARY_WINDOW_DAYS = 28;

function topCounts<T>(items: T[], min: number, limit: number): [T, number][] {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, n]) => n >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function summarizeRecentBehavior(
  events: readonly AppEvent[],
  logs: readonly LogEntry[],
  today: IsoDate,
): string[] {
  const since = addDays(today, -SUMMARY_WINDOW_DAYS);
  const recentEvents = events.filter((e) => e.date >= since && e.date <= today);
  const recentLogs = logs.filter((l) => l.date >= since && l.date <= today);
  const lines: string[] = [];

  const bought = topCounts(
    recentEvents.flatMap((e) => (e.type === "purchase" && e.foodId ? [e.foodId] : [])),
    2,
    6,
  );
  if (bought.length) lines.push(`Buys regularly: ${bought.map(([id]) => getFood(id as FoodId).name).join(", ")}.`);

  const rejected = topCounts(
    recentEvents.flatMap((e) => (e.type === "reject" && e.mealName ? [e.mealName] : [])),
    1,
    5,
  );
  if (rejected.length) {
    lines.push(`Said no to: ${rejected.map(([name, n]) => (n > 1 ? `${name} (${n}x)` : name)).join(", ")}. Avoid suggesting these.`);
  }

  const accepted = topCounts(
    recentEvents.flatMap((e) => (e.type === "accept" && e.mealName ? [e.mealName] : [])),
    1,
    5,
  );
  if (accepted.length) lines.push(`Liked: ${accepted.map(([name]) => name).join(", ")}.`);

  const eaten = topCounts(
    recentLogs.flatMap((l) => l.items.map((item) => (item.foodId ? getFood(item.foodId).name : item.label))),
    2,
    8,
  );
  if (eaten.length) lines.push(`Often eats: ${eaten.map(([name]) => name).join(", ")}.`);

  return lines;
}
