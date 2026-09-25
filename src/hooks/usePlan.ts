"use client";

/**
 * Everything the Today tab needs about the plan:
 * - the saved plan, RE-VERIFIED against today's date and the current pantry
 *   (a plan that was safe on Monday can contain expired chicken by Thursday);
 * - building the week, with a lock so a double tap can't fire two requests;
 * - regenerating one empty slot, also locked while it runs.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { todayIso } from "@/lib/dates";
import { enforcePlan, type EnforcedPlan } from "@/lib/safety/verify";
import { fetchPlan, fetchRegeneratedMeal, planRequestFrom } from "@/lib/planner/client";
import { addEvent, getState, savePlan } from "@/lib/storage";
import { newId } from "@/lib/ids";
import type { PlanGap } from "@/lib/types";
import { useAppState } from "./useAppState";

export interface VerifiedPlanView extends EnforcedPlan {
  /** Gaps from generation plus anything that became unsafe since. */
  gaps: PlanGap[];
}

export function usePlan() {
  const state = useAppState();
  const today = todayIso();
  const [building, setBuilding] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "notice" | "error"; text: string } | null>(null);
  const inFlight = useRef(false);

  const view = useMemo<VerifiedPlanView | null>(() => {
    if (!state.plan || !state.profile) return null;
    const enforced = enforcePlan(state.plan, { profile: state.profile, pantry: state.pantry, logs: state.logs, today });
    return { ...enforced, gaps: [...(state.plan.gaps ?? []), ...enforced.removed] };
  }, [state.plan, state.profile, state.pantry, state.logs, today]);

  const buildWeek = useCallback(async () => {
    if (inFlight.current) return; // a second tap while planning does nothing
    const request = planRequestFrom(getState(), todayIso());
    if (!request) return;
    inFlight.current = true;
    setBuilding(true);
    setMessage(null);
    try {
      const result = await fetchPlan(request);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      savePlan(result.reply.plan);
      if (result.reply.notice) setMessage({ kind: "notice", text: result.reply.notice });
      if (process.env.NODE_ENV !== "production") {
        console.info(`[FuelUp] plan source: ${result.reply.source}, AI attempts: ${result.reply.attempts}`);
      }
    } finally {
      inFlight.current = false;
      setBuilding(false);
    }
  }, []);

  const regenerate = useCallback(async (gap: PlanGap) => {
    if (inFlight.current) return;
    const current = getState();
    const request = planRequestFrom(current, todayIso());
    if (!request || !current.plan) return;
    // Start from the plan as it is SAFE today: meals that went bad since are
    // dropped (and become gaps), so regenerating can't bring them back.
    const enforced = enforcePlan(current.plan, request);
    const base = { ...enforced.plan, gaps: [...(current.plan.gaps ?? []), ...enforced.removed] };
    inFlight.current = true;
    setRegenerating(`${gap.date}|${gap.slot}`);
    setMessage(null);
    try {
      const result = await fetchRegeneratedMeal(request, base, { date: gap.date, slot: gap.slot, reasons: gap.reasons });
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      savePlan(result.reply.plan);
      addEvent({ id: newId(), type: "regenerate", date: todayIso(), mealName: result.reply.meal.name });
    } finally {
      inFlight.current = false;
      setRegenerating(null);
    }
  }, []);

  return { view, building, regenerating, message, dismissMessage: () => setMessage(null), buildWeek, regenerate };
}
