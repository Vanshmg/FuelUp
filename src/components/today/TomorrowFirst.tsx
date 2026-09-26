"use client";

import { useState } from "react";
import type { VerifiedPlanView } from "@/hooks/usePlan";
import type { PlanGap } from "@/lib/types";
import { DayCard, dayTitle } from "./WeekView";

/**
 * Tomorrow first. The whole week is still planned (groceries, batch cooking,
 * and weekly limits need it), but a full week at once is overwhelming, so the
 * rest stays folded away behind "Peek at the rest of the week".
 */
export function TomorrowFirst({
  view,
  tomorrow,
  regenerating,
  onRegenerate,
}: {
  view: VerifiedPlanView;
  tomorrow: string;
  regenerating: string | null;
  onRegenerate: (gap: PlanGap) => void;
}) {
  const [peeking, setPeeking] = useState(false);
  const tomorrowDay = view.plan.days.find((d) => d.date === tomorrow);
  const laterDays = view.plan.days.filter((d) => d.date > tomorrow);
  const laterGaps = view.gaps.filter((g) => g.date > tomorrow).length;
  const cardProps = (date: string) => ({
    gaps: view.gaps.filter((g) => g.date === date),
    warnings: view.warnings,
    regenerating,
    onRegenerate,
  });

  return (
    <div className="flex flex-col gap-4">
      {tomorrowDay ? (
        <DayCard day={tomorrowDay} title={`Tomorrow · ${dayTitle(tomorrowDay.date)}`} {...cardProps(tomorrowDay.date)} className="animate-rise" />
      ) : (
        <p className="rounded-card bg-cream-deep p-4 text-sm">Your plan doesn&apos;t cover tomorrow yet. Rebuild it to plan the week ahead.</p>
      )}

      {laterDays.length > 0 && (
        <button
          type="button"
          aria-expanded={peeking}
          aria-controls="rest-of-week"
          onClick={() => setPeeking((open) => !open)}
          className="flex items-center justify-between rounded-card border border-line bg-card px-5 py-4 text-left font-semibold shadow-soft transition-colors hover:bg-cream-deep"
        >
          <span>
            {peeking ? "Hide the rest of the week" : `Peek at the rest of the week (${laterDays.length} days)`}
            {laterGaps > 0 && !peeking && (
              <span className="mt-0.5 block text-xs font-normal text-ink-soft">
                {laterGaps === 1 ? "1 meal later this week needs a pick" : `${laterGaps} meals later this week need a pick`}
              </span>
            )}
          </span>
          <span aria-hidden className={`text-xl transition-transform duration-200 ${peeking ? "rotate-180" : ""}`}>
            ⌄
          </span>
        </button>
      )}

      {peeking && (
        <div id="rest-of-week" className="grid gap-4 xl:grid-cols-2">
          {laterDays.map((day) => (
            <DayCard key={day.date} day={day} title={dayTitle(day.date)} {...cardProps(day.date)} className="animate-rise" />
          ))}
        </div>
      )}
    </div>
  );
}
