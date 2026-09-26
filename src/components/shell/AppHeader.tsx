"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { todayIso } from "@/lib/dates";
import { getPersona } from "@/lib/data/personas";
import { formatUsd } from "@/lib/safety/budget";
import { weeklyBudgetStatus } from "@/lib/selectors";
import type { AppState, Profile } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { LogButton } from "./LogButton";
import { MenuSheet } from "./MenuSheet";
import { TopNav } from "./TopNav";

/** Logo, the budget chip ("$12 left this week"), and the menu. */
export function AppHeader({ state, profile }: { state: AppState; profile: Profile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const budget = weeklyBudgetStatus(profile, state.pantry, todayIso());
  const avatar = (state.personaId && getPersona(state.personaId)?.emoji) || "🙂";

  // Not sticky: it scrolls away with the page, so it never covers content.
  return (
    <header className="bg-forest">
      <div className="mx-auto flex h-16 max-w-md items-center justify-between gap-3 px-5 lg:h-20 lg:max-w-6xl lg:px-8">
        <div className="flex items-center gap-8">
          <Logo tone="dark" size={30} />
          <TopNav />
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <span className="hidden lg:inline-flex">
            <LogButton />
          </span>
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-semibold",
              budget.over ? "bg-chili-soft text-chili" : "bg-forest-tile text-mint",
            )}
            aria-label={
              budget.over
                ? `${formatUsd(-budget.remaining)} over your weekly grocery budget`
                : `${formatUsd(budget.remaining)} left in your weekly grocery budget`
            }
          >
            {budget.over ? `${formatUsd(-budget.remaining)} over` : `${formatUsd(budget.remaining)} left`}
            <span className="font-normal opacity-80"> this week</span>
          </span>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu and settings"
            className="flex size-11 items-center justify-center rounded-full border border-forest-line bg-forest-tile text-xl transition-transform duration-150 hover:bg-forest-line active:scale-[0.94]"
          >
            <span aria-hidden>{avatar}</span>
          </button>
        </div>
      </div>
      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} profile={profile} />
    </header>
  );
}
