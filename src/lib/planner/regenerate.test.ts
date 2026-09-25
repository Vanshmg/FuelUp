import { describe, expect, it } from "vitest";
import { getPersona } from "@/lib/data/personas";
import { checkWeeklyLimits } from "@/lib/safety/limits";
import { logged, meal, planFrom } from "@/lib/safety/testHelpers";
import type { JsonAi } from "@/lib/ai/types";
import type { PlanRequest } from "./context";
import { regenerateMeal } from "./regenerate";

const TODAY = "2026-09-25";
let n = 0;
const newId = () => `new-${++n}`;

/** Arjun with 4 egg meals logged in the last 4 days: AT his limit. */
function arjunAtEggLimit(): PlanRequest {
  const state = getPersona("arjun")!.build(TODAY);
  return {
    profile: state.profile!,
    pantry: [],
    events: [],
    today: TODAY,
    logs: ["2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"].map((date) => logged(date, "breakfast", ["egg"])),
  };
}

const eggMeal = {
  id: "ai-1", slot: "breakfast", name: "Egg bhurji wrap", prepMinutes: 10, effort: "minimal_cook", portions: 1, isNew: false,
  ingredients: [{ food: "egg", servings: 1 }, { food: "flour_tortilla", servings: 1 }],
};

describe("regenerating one slot can't break the plan", () => {
  // Tomorrow's breakfast was removed; the rest of the week is planned.
  const plan = {
    ...planFrom("2026-09-26", [[meal("Dal rice", ["toor_dal", "white_rice"], { slot: "lunch" })], [meal("Chana masala", ["chickpeas"])]]),
    gaps: [{ date: "2026-09-26", slot: "breakfast" as const, mealName: "Omelette", reasons: ["Would exceed egg limit"] }],
  };
  const ask = { date: "2026-09-26", slot: "breakfast" as const, reasons: ["Would exceed egg limit"] };

  it("rejects Gemini's egg meal at the limit, retries, then uses a safe built-in option", async () => {
    const calls: string[] = [];
    const ai: JsonAi = async (prompt) => {
      calls.push(prompt);
      return structuredClone(eggMeal); // Gemini keeps suggesting eggs
    };
    const req = arjunAtEggLimit();
    const result = await regenerateMeal(req, plan, ask, ai, newId);

    expect(calls).toHaveLength(2); // one retry
    expect(calls[1]).toContain("egg meals in 7 days");
    expect(result?.source).toBe("fallback");
    expect(result?.meal.name).not.toMatch(/egg/i);
    // The final plan passes the weekly-limit check.
    expect(checkWeeklyLimits(result!.plan, req.logs, req.profile.weeklyLimits, TODAY)).toEqual([]);
    // …and the gap is gone.
    expect(result!.plan.gaps).toEqual([]);
  });

  it("accepts Gemini's meal when it's safe for the whole plan", async () => {
    const req = { ...arjunAtEggLimit(), logs: [] }; // nowhere near the limit
    const ai: JsonAi = async () => structuredClone(eggMeal);
    const result = await regenerateMeal(req, plan, ask, ai, newId);
    expect(result).toMatchObject({ source: "ai", meal: { name: "Egg bhurji wrap", slot: "breakfast" } });
  });

  it("works with no key, using built-in options", async () => {
    const result = await regenerateMeal(arjunAtEggLimit(), plan, ask, null, newId);
    expect(result?.source).toBe("fallback");
    expect(result?.meal.slot).toBe("breakfast");
  });
});
