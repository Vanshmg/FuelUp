import { Card } from "@/components/ui/Card";
import { DAY_TYPE_LABELS } from "@/lib/data/labels";
import type { SafetyIssue } from "@/lib/safety/issues";
import type { DayPlan, MealSlot, PlanGap } from "@/lib/types";
import { GapCard } from "./GapCard";
import { MealRow } from "./MealRow";

const SLOT_ORDER: Record<MealSlot, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

export function dayTitle(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

interface DayCardProps {
  day: DayPlan;
  title: string;
  gaps: PlanGap[];
  warnings: SafetyIssue[];
  regenerating: string | null;
  onRegenerate: (gap: PlanGap) => void;
  className?: string;
}

/** One day: its meals in slot order, with "tap to regenerate" where a meal was taken out. */
export function DayCard({ day, title, gaps, warnings, regenerating, onRegenerate, className }: DayCardProps) {
  const entries = [
    ...day.meals.map((meal) => ({ kind: "meal" as const, slot: meal.slot, meal })),
    ...gaps.map((gap) => ({ kind: "gap" as const, slot: gap.slot, gap })),
  ].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);

  return (
    <Card className={`p-4 ${className ?? ""}`}>
      <header className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
        <h3 className="font-display text-lg font-extrabold">{title}</h3>
        <span className="shrink-0 text-xs font-semibold text-ink-soft">{DAY_TYPE_LABELS[day.dayType]}</span>
      </header>
      <ul className="divide-y divide-line">
        {entries.map((entry) =>
          entry.kind === "meal" ? (
            <MealRow key={entry.meal.id} meal={entry.meal} warnings={warnings.filter((w) => w.mealId === entry.meal.id)} />
          ) : (
            <GapCard
              key={`gap-${entry.gap.date}-${entry.gap.slot}`}
              gap={entry.gap}
              busy={regenerating === `${entry.gap.date}|${entry.gap.slot}`}
              disabled={regenerating !== null}
              onRegenerate={() => onRegenerate(entry.gap)}
            />
          ),
        )}
        {entries.length === 0 && <li className="py-3 text-sm text-ink-soft">Nothing planned (eating out?).</li>}
      </ul>
    </Card>
  );
}
