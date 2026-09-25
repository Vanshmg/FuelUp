import { describe, expect, it } from "vitest";
import type { PantryItem } from "@/lib/types";
import { canonicalizeIngredients } from "./canonical";
import { enforcePlan, verifyPlan, type VerifyContext } from "./verify";
import { logged, meal, planFrom, profile } from "./testHelpers";

const FRI = "2026-09-25";
const ctx = (overrides: Partial<VerifyContext> = {}): VerifyContext => ({
  profile: profile(),
  pantry: [],
  logs: [],
  today: FRI,
  ...overrides,
});

describe("canonicalizeIngredients", () => {
  it("accepts ids and exact aliases, and reports anything unknown", () => {
    const result = canonicalizeIngredients([
      { food: "egg", servings: 1 },
      { food: "Scrambled eggs", servings: 1 },
      { food: "pad thai sauce", servings: 1 },
    ]);
    expect(result.items.map((i) => i.foodId)).toEqual(["egg", "egg"]);
    expect(result.unknown).toEqual(["pad thai sauce"]);
  });
});

describe("verifyPlan", () => {
  it("passes a safe plan with no issues", () => {
    const plan = planFrom(FRI, [[meal("Rice and beans", ["white_rice", "black_beans"])]]);
    expect(verifyPlan(plan, ctx())).toEqual([]);
  });

  it("combines allergen, limit, and budget checks", () => {
    const plan = planFrom(FRI, [
      [meal("Satay noodles", ["peanut_sauce", "udon"], { slot: "lunch" }), meal("Omelette", ["egg"], { slot: "breakfast" })],
    ]);
    const issues = verifyPlan(
      plan,
      ctx({
        profile: profile({ avoidTags: ["peanut"], weeklyLimits: [{ tag: "egg", maxPerWeek: 1 }], weeklyBudget: 5 }),
        logs: [logged("2026-09-24", "breakfast", ["egg"])],
      }),
    );
    expect(issues.map((i) => i.code).sort()).toEqual(["hard_avoid", "over_budget", "weekly_limit"]);
  });

  it("blocks a meal that uses a pantry item past its date", () => {
    const chicken: PantryItem = {
      kind: "grocery", id: "c1", foodId: "chicken_thigh", purchasedOn: FRI, storage: "fridge", opened: false,
    };
    const useIt = meal("Chicken curry", ["chicken_thigh"]);
    useIt.items[0].pantryItemId = "c1";
    // Good through Saturday; planned for Sunday.
    const plan = planFrom(FRI, [[], [], [useIt]]);
    const issues = verifyPlan(plan, ctx({ pantry: [chicken] }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "expired", severity: "block" });
  });

  it("BLOCKS high-risk food planned after it would be unsafe (raw chicken on day 4)", () => {
    const plan = planFrom(FRI, [[], [], [], [meal("Chicken wrap", ["chicken_breast", "flour_tortilla"])]]);
    const issues = verifyPlan(plan, ctx());
    expect(issues.map((i) => [i.code, i.severity, i.foodId])).toEqual([["high_risk_late", "block", "chicken_breast"]]);
    expect(issues[0].message).toContain("Move \"Chicken wrap\" earlier");
  });

  it("allows the same chicken meal early in the week", () => {
    const plan = planFrom(FRI, [[meal("Chicken wrap", ["chicken_breast", "flour_tortilla"])]]);
    expect(verifyPlan(plan, ctx())).toEqual([]);
  });

  it("only WARNS for produce planned late (quality, not safety)", () => {
    const plan = planFrom(FRI, [[], [], [], [], [], [meal("Spinach salad", ["spinach", "black_beans"])]]);
    const issues = verifyPlan(plan, ctx());
    expect(issues.map((i) => [i.code, i.severity, i.foodId])).toEqual([["perishable_late", "warn", "spinach"]]);
  });

  it("covers every high-risk category: poultry, meat, fish, eggs, dairy", () => {
    for (const food of ["chicken_thigh", "ground_beef", "salmon", "cottage_cheese", "milk"] as const) {
      const plan = planFrom(FRI, [[], [], [], [], [], [], [], [], [meal("Late meal", [food])]]);
      expect(verifyPlan(plan, ctx()).map((i) => i.code), food).toContain("high_risk_late");
    }
    // Eggs keep 3 weeks, so they're only late after that.
    const eggsLate = planFrom(FRI, [...Array(21).fill([]), [meal("Eggs", ["egg"])]]);
    expect(verifyPlan(eggsLate, ctx()).map((i) => i.code)).toContain("high_risk_late");
  });

  it("enforces the 4-day leftover rule for batch meals", () => {
    const batch = meal("Chili", ["black_beans", "onion", "canned_tomatoes"], { portions: 4 });
    const later = (days: number) => meal(`Chili (day ${days})`, batch.items.map((i) => i.foodId), { leftoverOf: batch.id });
    const tooLate = later(4);
    const plan = planFrom(FRI, [[batch], [later(1)], [later(2)], [], [tooLate]]);
    const issues = verifyPlan(plan, ctx());
    expect(issues.map((i) => [i.code, i.mealId])).toEqual([["leftover_too_old", tooLate.id]]);
  });

  it("blocks leftovers that can't be traced to a cook date", () => {
    const plan = planFrom(FRI, [[meal("Mystery leftovers", ["white_rice"], { leftoverOf: "nope" })]]);
    expect(verifyPlan(plan, ctx())[0]).toMatchObject({ code: "leftover_unknown", severity: "block" });
  });

  it("warns about more than one new dish a week", () => {
    const plan = planFrom(FRI, [[meal("New 1", ["tofu"], { isNew: true })], [meal("New 2", ["tempeh"], { isNew: true })]]);
    expect(verifyPlan(plan, ctx()).map((i) => i.code)).toEqual(["too_many_new"]);
  });
});

describe("enforcePlan (the replace-never-show policy)", () => {
  it("removes blocked meals and keeps warnings", () => {
    const safe = meal("Kimbap", ["frozen_kimbap"], { slot: "lunch" });
    const unsafe = meal("PB&J", ["peanut_butter", "whole_wheat_bread"], { slot: "breakfast" });
    const plan = planFrom(FRI, [[unsafe, safe]]);

    const result = enforcePlan(plan, ctx({ profile: profile({ avoidTags: ["peanut"], weeklyBudget: 1 }) }));
    expect(result.plan.days[0].meals.map((m) => m.name)).toEqual(["Kimbap"]);
    expect(result.removed).toEqual([
      expect.objectContaining({ mealName: "PB&J", slot: "breakfast", reasons: [expect.stringContaining("contains peanuts")] }),
    ]);
    expect(result.warnings.map((w) => w.code)).toEqual(["over_budget"]);
  });

  it("removing an unsafe batch meal also removes its leftovers", () => {
    const batch = meal("Peanut noodles", ["peanut_sauce", "udon"], { portions: 2 });
    const leftovers = meal("Noodles again", ["udon"], { leftoverOf: batch.id });
    const plan = planFrom(FRI, [[batch], [leftovers]]);

    const result = enforcePlan(plan, ctx({ profile: profile({ avoidTags: ["peanut"] }) }));
    expect(result.plan.days.flatMap((d) => d.meals)).toEqual([]);
    expect(result.removed.map((r) => r.mealName)).toEqual(["Peanut noodles", "Noodles again"]);
  });

  it("re-checking later catches food that has gone off since", () => {
    const chicken: PantryItem = {
      kind: "grocery", id: "c1", foodId: "chicken_thigh", purchasedOn: FRI, storage: "fridge", opened: false,
    };
    const useIt = meal("Chicken curry", ["chicken_thigh"]);
    useIt.items[0].pantryItemId = "c1";
    const plan = planFrom(FRI, [[useIt]]);

    expect(enforcePlan(plan, ctx({ pantry: [chicken] })).removed).toEqual([]);
    // Same plan, but the user moved the chicken to the pantry by mistake.
    const leftOut = { ...chicken, storage: "pantry" as const };
    expect(enforcePlan(plan, ctx({ pantry: [leftOut] })).removed).toHaveLength(1);
  });
});
