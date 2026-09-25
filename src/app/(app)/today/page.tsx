"use client";

import { Card, EmptyState } from "@/components/ui/Card";
import { ProfileSummary } from "@/components/ProfileSummary";
import { BuildWeekButton } from "@/components/today/BuildWeek";
import { TodayHero } from "@/components/today/TodayHero";
import { WeekView } from "@/components/today/WeekView";
import { useAppState } from "@/hooks/useAppState";
import { usePlan } from "@/hooks/usePlan";
import { addDays, todayIso } from "@/lib/dates";
import { dayTotals } from "@/lib/nutrition";

export default function TodayPage() {
  const { profile } = useAppState();
  const { view, building, regenerating, message, dismissMessage, buildWeek, regenerate } = usePlan();
  if (!profile) return null; // AppShell handles the redirect

  const tomorrow = addDays(todayIso(), 1);
  // Only show today onward; FuelUp asks about tomorrow, it doesn't audit yesterday.
  const upcoming = view && {
    ...view,
    plan: { ...view.plan, days: view.plan.days.filter((d) => d.date >= tomorrow) },
  };
  const tomorrowPlan = upcoming?.plan.days.find((d) => d.date === tomorrow);
  const planWarnings = view?.warnings.filter((w) => !w.mealId) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <TodayHero profile={profile} stats={tomorrowPlan ? dayTotals(tomorrowPlan) : undefined} />

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
        <p key={warning.code} className="rounded-card bg-mustard-soft p-4 text-sm">
          💸 {warning.message}
        </p>
      ))}

      {upcoming && upcoming.plan.days.length > 0 ? (
        <>
          <WeekView view={upcoming} regenerating={regenerating} onRegenerate={regenerate} />
          <BuildWeekButton building={building} hasPlan onBuild={buildWeek} />
        </>
      ) : (
        <>
          <EmptyState emoji="🍳" title="Ready to plan your week?">
            Seven days of meals matched to your effort level and each day, built from food you know, and checked
            against your restrictions before you see them.
          </EmptyState>
          <BuildWeekButton building={building} hasPlan={false} onBuild={buildWeek} />
        </>
      )}

      <p className="text-center text-xs text-ink-soft">
        Numbers are estimates. Always check labels. FuelUp helps you plan; it isn&apos;t medical advice.
      </p>

      <Card>
        <h2 className="mb-4 font-display text-lg font-extrabold">What FuelUp knows about you</h2>
        <ProfileSummary profile={profile} />
      </Card>
    </div>
  );
}
