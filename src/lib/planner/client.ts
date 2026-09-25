/**
 * Browser side of planning: package saved data into a request, call the
 * server, and validate what comes back before saving it. The server is
 * trusted to verify, but we still parse its reply with zod, and the UI
 * re-verifies the plan every time it's shown.
 */
import { z } from "zod";
import { MealSchema, WeekPlanSchema, type AppState, type IsoDate, type MealSlot, type WeekPlan } from "@/lib/types";
import type { PlanRequest } from "./context";

export function planRequestFrom(state: AppState, today: IsoDate): PlanRequest | null {
  if (!state.profile) return null;
  return { profile: state.profile, pantry: state.pantry, logs: state.logs, events: state.events, today };
}

const ErrorReply = z.object({ error: z.string() });
const PlanReply = z.object({
  plan: WeekPlanSchema,
  source: z.enum(["ai", "fallback"]),
  notice: z.string().optional(),
  attempts: z.number(),
});
const MealReply = z.object({ meal: MealSchema, plan: WeekPlanSchema, source: z.enum(["ai", "fallback"]) });

export type PlanReply = z.infer<typeof PlanReply>;
export type MealReply = z.infer<typeof MealReply>;

const FRIENDLY_NETWORK_ERROR = "Couldn't reach FuelUp's server. Is `npm run dev` still running?";

async function post(url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

export async function fetchPlan(request: PlanRequest): Promise<{ ok: true; reply: PlanReply } | { ok: false; error: string }> {
  try {
    const data = await post("/api/plan", request);
    const reply = PlanReply.safeParse(data);
    if (reply.success) return { ok: true, reply: reply.data };
    const error = ErrorReply.safeParse(data);
    return { ok: false, error: error.success ? error.data.error : "Something went wrong building your plan. Try again?" };
  } catch {
    return { ok: false, error: FRIENDLY_NETWORK_ERROR };
  }
}

export async function fetchRegeneratedMeal(
  request: PlanRequest,
  plan: WeekPlan,
  ask: { date: IsoDate; slot: MealSlot; reasons: string[] },
): Promise<{ ok: true; reply: MealReply } | { ok: false; error: string }> {
  try {
    const data = await post("/api/meal", { context: request, plan, ask });
    const reply = MealReply.safeParse(data);
    if (reply.success) return { ok: true, reply: reply.data };
    const error = ErrorReply.safeParse(data);
    return { ok: false, error: error.success ? error.data.error : "Couldn't find a new option. Try again?" };
  } catch {
    return { ok: false, error: FRIENDLY_NETWORK_ERROR };
  }
}
