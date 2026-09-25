"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { todayIso } from "@/lib/dates";
import { getPersona } from "@/lib/data/personas";
import { formatUsd } from "@/lib/safety/budget";
import { weeklyBudgetStatus } from "@/lib/selectors";
import type { AppState, Profile } from "@/lib/types";
import { MenuSheet } from "./MenuSheet";

/** Logo, the budget chip ("$12 left this week"), and the menu. */
export function AppHeader({ state, profile }: { state: AppState; profile: Profile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const budget = weeklyBudgetStatus(profile, state.pantry, todayIso());
  const avatar = (state.personaId && getPersona(state.personaId)?.emoji) || "🙂";

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-md items-center justify-between gap-3 px-5">
        <span className="font-display text-2xl font-semibold tracking-tight">
          Fuel<span className="text-tomato">Up</span>
        </span>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-semibold",
              budget.over ? "bg-chili-soft text-chili" : "bg-basil-soft text-basil",
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
            className="flex size-11 items-center justify-center rounded-full border border-line bg-card text-xl shadow-soft hover:bg-cream-deep"
          >
            <span aria-hidden>{avatar}</span>
          </button>
        </div>
      </div>
      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} profile={profile} />
    </header>
  );
}
