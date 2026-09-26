"use client";

import { Card, EmptyState } from "@/components/ui/Card";
import { ProfileSummary } from "@/components/ProfileSummary";
import { BuildWeekButton } from "@/components/today/BuildWeek";
import { TodayHero } from "@/components/today/TodayHero";
import { TomorrowFirst } from "@/components/today/TomorrowFirst";
import { useAppState } from "@/hooks/useAppState";
import { usePlan } from "@/hooks/usePlan";
import { addDays, todayIso } from "@/lib/dates";
import { dayTotals } from "@/lib/nutrition";

/**
 * Today: tomorrow's plan first. Phones get one column; wide screens put
 * tomorrow's meals and the profile card side by side.
 */
export default function TodayPage() {
  const { profile } = useAppState();
  const { view, building, regenerating, message, dismissMessage, buildWeek, regenerate } = usePlan();
  if (!profile) return null; // AppShell handles the redirect

  const tomorrow = addDays(todayIso(), 1);
  const hasUpcoming = view?.plan.days.some((d) => d.date >= tomorrow) ?? false;
  const tomorrowPlan = view?.plan.days.find((d) => d.date === tomorrow);
  const planWarnings = view?.warnings.filter((w) => !w.mealId) ?? [];

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <TodayHero profile={profile} stats={tomorrowPlan ? dayTotals(tomorrowPlan) : undefined} />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <section aria-label="Your plan" className="flex flex-col gap-4">
          {message && (
            <div
              role={message.kind === "error" ? "alert" : "status"}
              className={`flex items-start gap-3 rounded-card border p-4 text-sm ${
                message.kind === "error" ? "border-chili/30 bg-chili-soft" : "border-mustard/30 bg-mustard-soft"
              }`}
            >
              <span aria-hidden>{message.kind === "error" ? "😕" : "💡"}</span>
              <p className="flex-1">{message.text}</p>
              <button type="button" onClick={dismissMessage} className="font-semibold text-ink-soft">
                OK
              </button>
            </div>
          )}

          {planWarnings.map((warning) => (
            <p key={warning.code} className="rounded-card bg-mustard-soft p-4 text-sm leading-relaxed">
              💸 {warning.message}
            </p>
          ))}

          {view && hasUpcoming ? (
            <>
              <TomorrowFirst view={view} tomorrow={tomorrow} regenerating={regenerating} onRegenerate={regenerate} />
              <BuildWeekButton building={building} hasPlan onBuild={buildWeek} />
            </>
          ) : (
            <>
              <EmptyState emoji="🍳" title="Ready to plan tomorrow?">
                FuelUp plans your week behind the scenes (for groceries and batch cooking) but shows you one day at
                a time. Every meal is checked against your restrictions before you see it.
              </EmptyState>
              <BuildWeekButton building={building} hasPlan={false} onBuild={buildWeek} />
            </>
          )}

          <p className="text-center text-xs text-ink-soft">
            Numbers are estimates. Always check labels. FuelUp helps you plan; it isn&apos;t medical advice.
          </p>
        </section>

        <aside aria-label="Your setup" className="lg:sticky lg:top-6">
          <Card>
            <h2 className="mb-4 font-display text-lg font-extrabold">What FuelUp knows about you</h2>
            <ProfileSummary profile={profile} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
