import { describe, expect, it } from "vitest";
import { checkWeeklyLimits } from "./limits";
import { logged, meal, planFrom } from "./testHelpers";
import type { WeeklyLimit } from "@/lib/types";

const EGG_LIMIT: WeeklyLimit[] = [{ tag: "egg", maxPerWeek: 4 }];
// 2026-09-25 is a Friday.
const FRI = "2026-09-25";

const omelette = (overrides = {}) => meal("Veggie omelette", ["egg", "spinach"], { slot: "breakfast", ...overrides });

describe("weekly limits: rolling 7-day window", () => {
  it("catches your example: eggs twice Friday, then Sat–Tue = too many in 5 days", () => {
    // Logged: 2 egg meals on Friday (breakfast + dinner). Plan starts Saturday.
    const logs = [logged(FRI, "breakfast", ["egg"]), logged(FRI, "dinner", ["egg"])];
    const plan = planFrom("2026-09-26", [[omelette()], [omelette()], [omelette()], [omelette()]]); // Sat–Tue

    const issues = checkWeeklyLimits(plan, logs, EGG_LIMIT, "2026-09-26");
    // Fri ×2 + Sat + Sun = 4 (ok). Mon would be the 5th, Tue the 5th again.
    expect(issues.map((i) => i.date)).toEqual(["2026-09-28", "2026-09-29"]);
    expect(issues[0]).toMatchObject({ code: "weekly_limit", severity: "block", tag: "egg" });
    expect(issues[0].message).toContain("5 egg meals in 7 days (your limit is 4)");
  });

  it("frees up again once old meals leave the window", () => {
    // 4 egg meals Mon–Thu, then one the NEXT Monday (7 days after the first): fine.
    const plan = planFrom("2026-09-21", [[omelette()], [omelette()], [omelette()], [omelette()], [], [], [], [omelette()]]);
    expect(checkWeeklyLimits(plan, [], EGG_LIMIT, "2026-09-21")).toEqual([]);
  });

  it("the window edge: 6 days back still counts, 7 days back doesn't", () => {
    const limit: WeeklyLimit[] = [{ tag: "egg", maxPerWeek: 1 }];
    const planSixLater = planFrom(FRI, [[], [], [], [], [], [], [omelette()]]); // Thu, 6 days after Fri
    expect(checkWeeklyLimits(planSixLater, [logged(FRI, "breakfast", ["egg"])], limit, FRI)).toHaveLength(1);

    const planSevenLater = planFrom(FRI, [[], [], [], [], [], [], [], [omelette()]]); // next Fri
    expect(checkWeeklyLimits(planSevenLater, [logged(FRI, "breakfast", ["egg"])], limit, FRI)).toEqual([]);
  });

  it("keeps the earliest meals and flags the later ones", () => {
    const plan = planFrom(FRI, [[omelette(), omelette({ slot: "lunch" }), omelette({ slot: "dinner" })]]);
    const issues = checkWeeklyLimits(plan, [], [{ tag: "egg", maxPerWeek: 2 }], FRI);
    expect(issues.map((i) => i.slot)).toEqual(["dinner"]);
  });
});

describe("weekly limits: what counts as eaten", () => {
  it("counts planned meals on past days with nothing logged (assumed eaten)", () => {
    // Plan started Tuesday with an omelette each day Tue–Thu. Nothing logged. Today is Friday.
    const plan = planFrom("2026-09-22", [[omelette()], [omelette()], [omelette()], [omelette()], [omelette()]]);
    const issues = checkWeeklyLimits(plan, [], EGG_LIMIT, FRI);
    // Tue, Wed, Thu assumed + Fri = 4 (ok). Sat would be the 5th.
    expect(issues.map((i) => i.date)).toEqual(["2026-09-26"]);
  });

  it("a log replaces the planned meal in that slot", () => {
    // Tuesday's planned omelette was actually oatmeal (logged), so it doesn't count.
    const plan = planFrom("2026-09-22", [[omelette()], [omelette()], [omelette()], [omelette()], [omelette()]]);
    const logs = [logged("2026-09-22", "breakfast", ["oats"])];
    expect(checkWeeklyLimits(plan, logs, EGG_LIMIT, FRI)).toEqual([]);
  });

  it("counts logged meals from before the plan started", () => {
    const logs = [
      logged("2026-09-22", "breakfast", ["egg"]),
      logged("2026-09-23", "breakfast", ["egg"]),
      logged("2026-09-24", "lunch", ["egg"]),
    ];
    const plan = planFrom(FRI, [[omelette()], [omelette()]]);
    expect(checkWeeklyLimits(plan, logs, EGG_LIMIT, FRI).map((i) => i.date)).toEqual(["2026-09-26"]);
  });

  it("counts a meal once, however many egg ingredients it has", () => {
    const eggMayoSandwich = meal("Egg salad sandwich", ["egg", "mayo", "whole_wheat_bread"]);
    const plan = planFrom(FRI, [[eggMayoSandwich]]);
    expect(checkWeeklyLimits(plan, [], [{ tag: "egg", maxPerWeek: 1 }], FRI)).toEqual([]);
  });

  it("counts meals and logs by name when no ingredient is tagged", () => {
    const logs = [logged("2026-09-24", "breakfast", [], "Egg fried rice from the dining hall")];
    const plan = planFrom(FRI, [[meal("Masala omelette", ["onion", "green_chili"], { slot: "breakfast" })]]);
    expect(checkWeeklyLimits(plan, logs, [{ tag: "egg", maxPerWeek: 1 }], FRI)).toHaveLength(1);
  });

  it("does NOT count 'may contain' toward a limit (bread isn't an egg meal)", () => {
    const toast = meal("Toast and jam", ["whole_wheat_bread"], { slot: "breakfast" });
    const plan = planFrom(FRI, [[toast], [toast], [toast]]);
    expect(checkWeeklyLimits(plan, [], [{ tag: "egg", maxPerWeek: 1 }], FRI)).toEqual([]);
  });

  it("handles several limits independently (Arjun: eggs 4, chocolate 3)", () => {
    const limits: WeeklyLimit[] = [
      { tag: "egg", maxPerWeek: 4 },
      { tag: "chocolate", maxPerWeek: 3 },
    ];
    const logs = [logged("2026-09-24", "snack", ["dark_chocolate"]), logged("2026-09-23", "snack", ["dark_chocolate"])];
    const choc = meal("Dark chocolate square", ["dark_chocolate"], { slot: "snack" });
    const plan = planFrom(FRI, [[choc], [choc]]);
    const issues = checkWeeklyLimits(plan, logs, limits, FRI);
    expect(issues.map((i) => [i.tag, i.date])).toEqual([["chocolate", "2026-09-26"]]);
  });
});
