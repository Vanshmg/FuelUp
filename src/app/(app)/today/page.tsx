"use client";

import { Card, EmptyState } from "@/components/ui/Card";
import { ProfileSummary } from "@/components/ProfileSummary";
import { useAppState } from "@/hooks/useAppState";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function TodayPage() {
  const { profile } = useAppState();
  if (!profile) return null; // AppShell handles the redirect

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-sm font-semibold text-ink-soft">{dateLabel}</p>
        <h1 className="font-display text-3xl font-semibold">
          {greeting(now.getHours())}
          {profile.name && <span className="whitespace-nowrap">, {profile.name} 👋</span>}
          {!profile.name && " 👋"}
        </h1>
      </header>

      <EmptyState emoji="🍳" title="Tomorrow's plan lives here">
        Plan generation arrives in Phase 5: meals matched to your effort level and each day, checked for safety
        before you see them.
      </EmptyState>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">What FuelUp knows about you</h2>
        <ProfileSummary profile={profile} />
      </Card>
    </div>
  );
}
