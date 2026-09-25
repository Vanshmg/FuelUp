"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Splash } from "@/components/shell/AppShell";
import { useAppState, useHydrated } from "@/hooks/useAppState";

export default function OnboardingPage() {
  const hydrated = useHydrated();
  const { profile } = useAppState();
  const router = useRouter();

  // Already set up? Go to the plan. ("Start over" in the menu clears the profile first.)
  useEffect(() => {
    if (hydrated && profile) router.replace("/today");
  }, [hydrated, profile, router]);

  if (!hydrated || profile) return <Splash />;
  return <OnboardingFlow />;
}
