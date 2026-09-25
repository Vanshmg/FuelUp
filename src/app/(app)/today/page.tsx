"use client";

import { Card, EmptyState } from "@/components/ui/Card";
import { ProfileSummary } from "@/components/ProfileSummary";
import { TodayHero } from "@/components/today/TodayHero";
import { useAppState } from "@/hooks/useAppState";

export default function TodayPage() {
  const { profile } = useAppState();
  if (!profile) return null; // AppShell handles the redirect

  return (
    <div className="flex flex-col gap-5">
      <TodayHero profile={profile} />

      <EmptyState emoji="🍳" title="Tomorrow's plan lives here">
        Plan generation arrives in Phase 5: meals matched to your effort level and each day, checked for safety
        before you see them.
      </EmptyState>

      <Card>
        <h2 className="mb-4 font-display text-lg font-extrabold">What FuelUp knows about you</h2>
        <ProfileSummary profile={profile} />
      </Card>
    </div>
  );
}
