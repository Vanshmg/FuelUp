import { describe, expect, it, vi } from "vitest";
import { getPersona } from "@/lib/data/personas";
import { addDays } from "@/lib/dates";
import { effectiveAvoidTags, foodConflicts } from "@/lib/safety/allergens";
import { enforcePlan, verifyPlan } from "@/lib/safety/verify";
import type { JsonAi } from "@/lib/ai/types";
import type { FoodId } from "@/lib/types";
import { planDays, toVerifyContext, type PlanRequest } from "./context";
import { planWeek } from "./pipeline";
import { pickSamplePlan } from "./samplePlans";
import { buildPlanPrompt, allowedFoodIds } from "@/lib/ai/prompts";

const TODAY = "2026-09-25";
const OPTS = { planId: "p1", createdAt: "2026-09-25T12:00:00.000Z" };

function requestFor(personaId: string): PlanRequest {
  const state = getPersona(personaId)!.build(TODAY);
  return { profile: state.profile!, pantry: state.pantry, logs: state.logs, events: state.events, today: TODAY };
}

type AiMealSpec = { slot: "breakfast" | "lunch" | "dinner" | "snack"; name: string; foods: string[] };

/** What Gemini would send back: a week of meals on the plan's dates. */
function aiWeek(meals: (dayIndex: number) => AiMealSpec[]) {
  return {
    days: Array.from({ length: 7 }, (_, i) => ({
      date: addDays(TODAY, i + 1),
      meals: meals(i).map((m, j) => ({
        id: `d${i}-${j}`,
        slot: m.slot,
        name: m.name,
        ingredients: m.foods.map((food) => ({ food, servings: 1 })),
        prepMinutes: 10,
        effort: "minimal_cook",
        portions: 1,
        isNew: false,
      })),
    })),
  };
}

const safeDay = (): AiMealSpec[] => [
  { slot: "breakfast", name: "Oats + banana", foods: ["oats", "banana"] },
  { slot: "lunch", name: "Rice and beans", foods: ["white_rice", "black_beans", "salsa"] },
  { slot: "dinner", name: "Veggie dumplings", foods: ["frozen_veggie_dumplings", "frozen_broccoli"] },
];

/** A fake Gemini that returns the given replies in order. */
function fakeAi(...replies: unknown[]): JsonAi & { calls: string[] } {
  const calls: string[] = [];
  const fn: JsonAi = async (prompt) => {
    calls.push(prompt);
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (reply instanceof Error) throw reply;
    return structuredClone(reply);
  };
  return Object.assign(fn, { calls });
}

const mealsOf = (plan: { days: { meals: { name: string }[] }[] }) => plan.days.flatMap((d) => d.meals);

describe("planWeek: the AI path", () => {
  it("uses a safe AI plan as-is, in one call", async () => {
    const ai = fakeAi(aiWeek(safeDay));
    const result = await planWeek(requestFor("jae"), ai, OPTS);
    expect(result).toMatchObject({ source: "ai", attempts: 1 });
    expect(mealsOf(result.plan)).toHaveLength(21);
    expect(result.plan.gaps).toBeUndefined();
    expect(result.plan.days[0].date).toBe("2026-09-26"); // starts tomorrow
  });

  it("retries ONCE with the exact problems, and uses the fixed plan", async () => {
    const unsafe = aiWeek((i) => (i === 0 ? [{ slot: "breakfast", name: "Granola parfait", foods: ["greek_yogurt", "granola"] }, ...safeDay().slice(1)] : safeDay()));
    const ai = fakeAi(unsafe, aiWeek(safeDay));
    const result = await planWeek(requestFor("jae"), ai, OPTS);

    expect(result.attempts).toBe(2);
    expect(ai.calls[1]).toContain("YOUR PREVIOUS PLAN HAD THESE PROBLEMS");
    expect(ai.calls[1]).toContain("Granola");
    expect(mealsOf(result.plan).map((m) => m.name)).not.toContain("Granola parfait");
    expect(result.plan.gaps).toBeUndefined();
  });

  it("removes a meal that's STILL unsafe after the retry (never shown), and records a gap", async () => {
    const unsafe = aiWeek((i) => (i === 0 ? [{ slot: "dinner", name: "Satay noodles", foods: ["peanut_sauce", "udon"] }, ...safeDay().slice(0, 2)] : safeDay()));
    const ai = fakeAi(unsafe, unsafe);
    const result = await planWeek(requestFor("jae"), ai, OPTS);

    expect(result.attempts).toBe(2);
    expect(mealsOf(result.plan).map((m) => m.name)).not.toContain("Satay noodles");
    expect(result.plan.gaps).toEqual([
      expect.objectContaining({ date: "2026-09-26", slot: "dinner", mealName: "Satay noodles" }),
    ]);
  });

  it("treats an ingredient outside the catalog as a failed check", async () => {
    const withUnknown = aiWeek((i) => (i === 2 ? [{ slot: "lunch", name: "Pad thai", foods: ["udon", "pad thai sauce"] }] : safeDay()));
    const ai = fakeAi(withUnknown, withUnknown);
    const result = await planWeek(requestFor("sofia"), ai, OPTS);

    expect(ai.calls[1]).toContain('"pad thai sauce"');
    expect(mealsOf(result.plan).map((m) => m.name)).not.toContain("Pad thai");
    expect(result.plan.gaps?.[0]).toMatchObject({ mealName: "Pad thai", slot: "lunch" });
  });

  it("enforces Arjun's egg limit across logged meals + the plan", async () => {
    // Gemini ignores the limit: an omelette every morning.
    const eggy = aiWeek(() => [{ slot: "breakfast", name: "Masala omelette", foods: ["egg", "onion"] }, ...safeDay().slice(1)]);
    const result = await planWeek(requestFor("arjun"), fakeAi(eggy, eggy), OPTS);
    const eggBreakfasts = result.plan.days.filter((d) => d.meals.some((m) => m.name === "Masala omelette"));
    // 2 egg meals already logged in the last days → only 2 more fit the first window.
    expect(eggBreakfasts.length).toBeLessThan(7);
    expect(verifyPlan(result.plan, toVerifyContext(requestFor("arjun"))).filter((i) => i.severity === "block")).toEqual([]);
  });

  it("maps leftovers to their batch meal", async () => {
    const week = aiWeek(safeDay);
    week.days[0].meals.push({
      id: "chili-batch", slot: "dinner", name: "Veggie chili", ingredients: [{ food: "black_beans", servings: 1 }],
      prepMinutes: 40, effort: "likes_cooking", portions: 3, isNew: false,
    } as never);
    week.days[1].meals.push({
      id: "chili-2", slot: "lunch", name: "Chili leftovers", ingredients: [{ food: "black_beans", servings: 1 }],
      prepMinutes: 3, effort: "likes_cooking", portions: 1, leftoverOf: "chili-batch", isNew: false,
    } as never);
    const result = await planWeek(requestFor("sofia"), fakeAi(week), OPTS);
    const batch = result.plan.days[0].meals.find((m) => m.name === "Veggie chili")!;
    const leftovers = result.plan.days[1].meals.find((m) => m.name === "Chili leftovers")!;
    expect(leftovers.leftoverOf).toBe(batch.id);
  });
});

describe("planWeek: never crashes, falls back instead", () => {
  it("no key → built-in plan with a friendly notice", async () => {
    const result = await planWeek(requestFor("sofia"), null, OPTS);
    expect(result).toMatchObject({ source: "fallback", attempts: 0 });
    expect(result.notice).toContain("No Gemini key");
  });

  it("network error twice → built-in plan", async () => {
    const ai = fakeAi(new Error("fetch failed"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await planWeek(requestFor("jae"), ai, OPTS);
    expect(result).toMatchObject({ source: "fallback", attempts: 2 });
    expect(result.notice).toContain("didn't come through");
  });

  it("bad JSON, then good JSON → uses the good one", async () => {
    const result = await planWeek(requestFor("jae"), fakeAi({ nonsense: true }, aiWeek(safeDay)), OPTS);
    expect(result).toMatchObject({ source: "ai", attempts: 2 });
    expect(mealsOf(result.plan)).toHaveLength(21);
  });
});

describe("the prompt", () => {
  it("never includes the user's name, and never lists avoided foods", () => {
    const req = requestFor("jae");
    const prompt = buildPlanPrompt(req, planDays(req.profile, TODAY));
    expect(prompt).not.toContain("Jae");
    for (const food of ["peanut_butter", "peanut_sauce", "granola", "trail_mix", "protein_bar"]) {
      expect(prompt).not.toContain(food);
    }
    expect(prompt).toContain("greek_yogurt");
  });

  it("lists kitchen items soonest-first and Arjun's recent egg meals", () => {
    const req = requestFor("arjun");
    const prompt = buildPlanPrompt(req, planDays(req.profile, TODAY));
    expect(prompt).toContain("Chicken thighs (chicken_thigh), good through 2026-09-26");
    expect(prompt).toMatch(/eggs: at most 4 meals in ANY 7 days in a row\. Already eaten in the days before the plan: 2/);
  });

  it("allowed foods respect diets (Sofia: no meat, no dairy)", () => {
    const allowed = allowedFoodIds(requestFor("sofia").profile);
    const avoid = effectiveAvoidTags(requestFor("sofia").profile);
    for (const id of allowed) expect(foodConflicts(id as FoodId, avoid)).toEqual([]);
    expect(allowed).not.toContain("chicken_thigh");
    expect(allowed).not.toContain("greek_yogurt");
  });
});

describe("built-in sample weeks are diet-aware", () => {
  it.each(["jae", "arjun", "sofia"])("%s gets a full, fully safe week (no gaps)", (id) => {
    const req = requestFor(id);
    const pick = pickSamplePlan(req, planDays(req.profile, TODAY), "p", "t");
    expect(pick.removed).toEqual([]);
    expect(mealsOf(pick.plan).length).toBe(28);
    expect(enforcePlan(pick.plan, toVerifyContext(req)).removed).toEqual([]);
  });

  it("picks the matching style: Sofia gets the plant-based week, Arjun the home-style one", () => {
    const pickFor = (id: string) => {
      const req = requestFor(id);
      return pickSamplePlan(req, planDays(req.profile, TODAY), "p", "t").templateId;
    };
    expect(pickFor("sofia")).toBe("plant");
    expect(pickFor("arjun")).toBe("home");
    expect(pickFor("jae")).toBe("ready");
  });

  it("still gives a strict vegan with many allergies a usable week", () => {
    const req = requestFor("sofia");
    req.profile = { ...req.profile, diet: "vegan", avoidTags: ["peanut", "tree_nut", "sesame", "soy", "wheat"] };
    const pick = pickSamplePlan(req, planDays(req.profile, TODAY), "p", "t");
    expect(mealsOf(pick.plan).length).toBeGreaterThanOrEqual(10);
    expect(verifyPlan(pick.plan, toVerifyContext(req)).filter((i) => i.severity === "block")).toEqual([]);
  });
});
