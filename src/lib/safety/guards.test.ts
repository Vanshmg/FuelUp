/**
 * Guards on the safety system itself, so future changes can't quietly
 * weaken it.
 */
import { describe, expect, it } from "vitest";
import { getPersona } from "@/lib/data/personas";
import type { PantryItem } from "@/lib/types";
import { canonicalizeMeal, type DraftMeal } from "./canonical";
import { makeIssue } from "./issues";
import { cheaperCandidates, safeSwaps } from "./swaps";
import { logged, meal, planFrom, profile } from "./testHelpers";
import { enforcePlan, verifyMealInPlan, verifyPlan, type VerifyContext } from "./verify";

const FRI = "2026-09-25";
const ctx = (overrides: Partial<VerifyContext> = {}): VerifyContext => ({
  profile: profile(),
  pantry: [],
  logs: [],
  today: FRI,
  ...overrides,
});

describe("every blocking issue names the meal it blocks", () => {
  it("is enforced by the type system", () => {
    // @ts-expect-error — a blocking issue without a mealId must not compile.
    makeIssue("hard_avoid", "no meal id");
    // Warnings may be plan-level.
    expect(makeIssue("over_budget", "plan-level warning").severity).toBe("warn");
  });

  it("holds for every check, across a plan that breaks all of them", () => {
    const eggs = (slot: "breakfast" | "lunch" | "dinner") => meal("Omelette", ["egg"], { slot });
    const oldChicken: PantryItem = {
      kind: "grocery", id: "c1", foodId: "chicken_thigh", purchasedOn: "2026-09-20", storage: "fridge", opened: false,
    };
    const usesOldChicken = meal("Chicken curry", ["chicken_thigh"], { slot: "lunch" });
    usesOldChicken.items[0].pantryItemId = "c1";
    const batch = meal("Chili", ["black_beans"], { portions: 2 });

    const plan = planFrom(FRI, [
      [
        meal("PB granola bowl", ["peanut_butter", "granola"], { slot: "breakfast" }), // hard_avoid, may_contain
        usesOldChicken, // expired
        meal("Chicken satay", ["rotisserie_chicken"], { slot: "dinner" }), // name_mentions (satay → peanut)
        meal("Mushrooms", ["mushrooms"], { slot: "snack", isNew: true }), // avoid_food
        batch,
      ],
      [eggs("breakfast"), eggs("lunch"), eggs("dinner"), meal("Ghost leftovers", ["white_rice"], { leftoverOf: "nope" })],
      [meal("Chicken", ["chicken_breast"], { isNew: true })], // high_risk_late (bought Fri, good through Sat)
      [], [],
      [meal("Chili again", ["black_beans"], { leftoverOf: batch.id })], // leftover_too_old
    ]);

    const issues = verifyPlan(
      plan,
      ctx({
        profile: profile({
          avoidTags: ["peanut"],
          avoidFoods: ["mushrooms"],
          weeklyLimits: [{ tag: "egg", maxPerWeek: 2 }],
          weeklyBudget: 1,
        }),
        pantry: [oldChicken],
        logs: [logged("2026-09-24", "breakfast", ["egg"])],
      }),
    );

    const codes = new Set(issues.map((i) => i.code));
    for (const code of [
      "hard_avoid", "may_contain", "avoid_food", "name_mentions", "weekly_limit", "expired",
      "leftover_too_old", "leftover_unknown", "high_risk_late",
    ]) {
      expect(codes, code).toContain(code);
    }
    for (const issue of issues.filter((i) => i.severity === "block")) {
      expect(issue.mealId, issue.message).toBeTruthy();
    }
  });
});

describe("unknown ingredients (produced by canonicalizeMeal, used in Phase 5)", () => {
  const draft = (ingredients: DraftMeal["ingredients"]): DraftMeal => ({
    id: "ai-1", slot: "dinner", name: "Pad thai", prepMinutes: 20, effort: "minimal_cook", portions: 1, isNew: false,
    ingredients,
  });

  it("accepts a meal whose ingredients are all in the catalog", () => {
    const result = canonicalizeMeal(draft([{ food: "udon", servings: 1 }, { food: "scrambled eggs", servings: 1 }]));
    expect(result.issues).toEqual([]);
    expect(result.meal?.items.map((i) => i.foodId)).toEqual(["udon", "egg"]);
  });

  it("blocks the whole meal (with its mealId) if any ingredient is unknown", () => {
    const result = canonicalizeMeal(
      draft([{ food: "udon", servings: 1 }, { food: "pad thai sauce", servings: 1 }]),
      "2026-09-29",
    );
    expect(result.meal).toBeNull(); // never partially accepted
    expect(result.issues).toEqual([
      expect.objectContaining({ code: "unknown_ingredient", severity: "block", mealId: "ai-1", date: "2026-09-29" }),
    ]);
    expect(result.issues[0].message).toContain('"pad thai sauce"');
  });

  it("blocks a meal with no ingredients at all", () => {
    expect(canonicalizeMeal(draft([])).issues[0]).toMatchObject({ code: "unknown_ingredient", mealId: "ai-1" });
  });
});

describe("swaps are re-verified against the whole plan (safety before price)", () => {
  const arjun = getPersona("arjun")!.build(FRI);
  // Arjun is AT his egg limit: 4 egg meals in the last 4 days.
  const atEggLimit = [
    logged("2026-09-21", "breakfast", ["egg"]),
    logged("2026-09-22", "breakfast", ["egg"]),
    logged("2026-09-23", "breakfast", ["egg"]),
    logged("2026-09-24", "breakfast", ["egg"]),
  ];
  const chickenDinner = meal("Chicken curry", ["chicken_breast", "onion", "canned_tomatoes"]);
  const plan = planFrom(FRI, [[chickenDinner]]);
  const arjunCtx = ctx({ profile: arjun.profile!, logs: atEggLimit });

  it("eggs ARE a cheaper same-role candidate for chicken breast…", () => {
    expect(cheaperCandidates("chicken_breast", ["beef", "pork"]).map((c) => c.foodId)).toContain("egg");
  });

  it("…but safeSwaps won't offer them to Arjun at his egg limit", () => {
    const offered = safeSwaps(plan, "chicken_breast", arjunCtx, { mealId: chickenDinner.id, limit: 20 });
    expect(offered.map((s) => s.foodId)).not.toContain("egg");
    expect(offered[0].foodId).toBe("chicken_thigh"); // the closest safe swap still comes first
  });

  it("offers eggs again once he's under the limit", () => {
    const underLimit = ctx({ profile: arjun.profile!, logs: atEggLimit.slice(0, 2) });
    const offered = safeSwaps(plan, "chicken_breast", underLimit, { mealId: chickenDinner.id, limit: 20 });
    expect(offered.map((s) => s.foodId)).toContain("egg");
  });

  it("won't swap in a raw protein that wouldn't keep until that day", () => {
    // Canned tuna on day 4 is fine; raw chicken thighs bought day 1 would not be.
    const tunaLate = meal("Tuna rice bowl", ["canned_tuna", "white_rice"]);
    const latePlan = planFrom(FRI, [[], [], [], [tunaLate]]);
    const candidates = cheaperCandidates("canned_tuna", []).map((c) => c.foodId);
    expect(candidates).toContain("chicken_thigh");

    const offered = safeSwaps(latePlan, "canned_tuna", ctx(), { mealId: tunaLate.id, limit: 20 });
    expect(offered.map((s) => s.foodId)).not.toContain("chicken_thigh");
    expect(offered.map((s) => s.foodId)).toContain("egg"); // eggs keep 3 weeks
  });

  it("every offered swap comes with a plan that passes enforcement untouched", () => {
    for (const swap of safeSwaps(plan, "chicken_breast", arjunCtx, { mealId: chickenDinner.id, limit: 20 })) {
      expect(enforcePlan(swap.plan, arjunCtx).removed).toEqual([]);
    }
  });
});

describe("single-meal suggestions are re-verified against the whole plan", () => {
  it("a meal that's fine alone is rejected if it pushes a LATER meal over a limit", () => {
    const limitCtx = ctx({ profile: profile({ weeklyLimits: [{ tag: "egg", maxPerWeek: 1 }] }) });
    const saturdayEggs = meal("Sat omelette", ["egg"], { slot: "breakfast" });
    const plan = planFrom(FRI, [[], [saturdayEggs]]);

    // "I'm lazy tonight" suggests egg fried rice for Friday dinner.
    const suggestion = meal("Egg fried rice", ["egg", "microwave_rice", "frozen_peas"]);
    const check = verifyMealInPlan(plan, FRI, suggestion, limitCtx);

    expect(check.ok).toBe(false);
    // The problem shows up on Saturday's meal, not on the suggestion itself.
    expect(check.blocking.map((i) => i.mealId)).toEqual([saturdayEggs.id]);
  });

  it("accepts a safe suggestion and returns the verified plan", () => {
    const plan = planFrom(FRI, [[meal("Old dinner", ["frozen_pizza"])]]);
    const oldId = plan.days[0].meals[0].id;
    const check = verifyMealInPlan(plan, FRI, meal("Dumplings", ["frozen_veggie_dumplings"]), ctx(), oldId);
    expect(check.ok).toBe(true);
    expect(check.plan?.days[0].meals.map((m) => m.name)).toEqual(["Dumplings"]);
  });
});
