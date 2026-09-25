import { describe, expect, it } from "vitest";
import { weeklyBudgetStatus } from "@/lib/selectors";
import { profile } from "@/lib/safety/testHelpers";
import type { PantryItem } from "@/lib/types";

const paid = (purchasedOn: string, pricePaid: number): PantryItem => ({
  kind: "grocery", id: purchasedOn + pricePaid, foodId: "egg", purchasedOn, storage: "fridge", opened: false, pricePaid,
});

describe("weeklyBudgetStatus (the header chip)", () => {
  it("counts only purchases since the last shopping day", () => {
    const me = profile({ weeklyBudget: 40, shoppingDay: "sun" });
    // Today is Fri Sep 25; last shopping day was Sun Sep 20.
    const pantry = [paid("2026-09-19", 30), paid("2026-09-20", 12.5), paid("2026-09-23", 4.25)];
    expect(weeklyBudgetStatus(me, pantry, "2026-09-25")).toMatchObject({ spent: 16.75, remaining: 23.25, over: false });
  });

  it("shows the full budget before anything is bought", () => {
    expect(weeklyBudgetStatus(profile({ weeklyBudget: 45 }), [], "2026-09-25").remaining).toBe(45);
  });
});
