"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppState, useHydrated } from "@/hooks/useAppState";
import { getLoadNotices } from "@/lib/storage";
import { AppHeader } from "./AppHeader";
import { LogButton } from "./LogButton";
import { TabBar } from "./TabBar";

/** Header + page + tab bar + "+ Log". Sends you to onboarding if there's no profile yet. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const state = useAppState();
  const router = useRouter();
  const [dismissedNotices, setDismissedNotices] = useState(false);

  const needsOnboarding = hydrated && !state.profile;
  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  if (!hydrated || !state.profile) return <Splash />;

  const notices = dismissedNotices ? [] : getLoadNotices();

  return (
    <div className="min-h-dvh pb-40">
      <AppHeader state={state} profile={state.profile} />
      {notices.length > 0 && (
        <div role="status" className="mx-auto mt-3 flex max-w-md items-start gap-3 px-5">
          <div className="flex flex-1 items-start gap-3 rounded-card border border-mustard/30 bg-mustard-soft p-4 text-sm">
            <span aria-hidden>⚠️</span>
            <p className="flex-1">{notices.join(" ")}</p>
            <button type="button" className="font-semibold text-mustard" onClick={() => setDismissedNotices(true)}>
              OK
            </button>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-md px-5 pt-5">{children}</main>
      <LogButton />
      <TabBar />
    </div>
  );
}

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <span className="animate-pulse text-5xl" role="img" aria-label="Loading FuelUp">
        🥗
      </span>
    </div>
  );
}
