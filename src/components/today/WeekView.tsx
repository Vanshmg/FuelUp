import { Card } from "@/components/ui/Card";
import { DAY_TYPE_LABELS } from "@/lib/data/labels";
import type { VerifiedPlanView } from "@/hooks/usePlan";
import type { MealSlot, PlanGap } from "@/lib/types";
import { GapCard } from "./GapCard";
import { MealRow } from "./MealRow";

const SLOT_ORDER: Record<MealSlot, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

function dayTitle(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

/** The verified week, one card per day. Gaps show where a meal was taken out. */
export function WeekView({
  view,
  regenerating,
  onRegenerate,
}: {
  view: VerifiedPlanView;
  regenerating: string | null;
  onRegenerate: (gap: PlanGap) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {view.plan.days.map((day, index) => {
        const gaps = view.gaps.filter((g) => g.date === day.date);
        const entries = [
          ...day.meals.map((meal) => ({ kind: "meal" as const, slot: meal.slot, meal })),
          ...gaps.map((gap) => ({ kind: "gap" as const, slot: gap.slot, gap })),
        ].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);

        return (
          <Card key={day.date} className="animate-rise p-4" style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}>
            <header className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
              <h3 className="font-display text-lg font-extrabold">{index === 0 ? `Tomorrow · ${dayTitle(day.date)}` : dayTitle(day.date)}</h3>
              <span className="shrink-0 text-xs font-semibold text-ink-soft">{DAY_TYPE_LABELS[day.dayType]}</span>
            </header>
            <ul className="divide-y divide-line">
              {entries.map((entry) =>
                entry.kind === "meal" ? (
                  <MealRow
                    key={entry.meal.id}
                    meal={entry.meal}
                    warnings={view.warnings.filter((w) => w.mealId === entry.meal.id)}
                  />
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
      })}
    </div>
  );
}
