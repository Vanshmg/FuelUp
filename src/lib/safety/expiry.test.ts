import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { getPersona } from "@/lib/data/personas";
import type { PantryItem } from "@/lib/types";
import { expiresOn, freshness, freshPurchaseUseBy, isGoodOn, usablePantry } from "./expiry";

const MON = "2026-09-21";

const grocery = (overrides: Partial<Extract<PantryItem, { kind: "grocery" }>> = {}): PantryItem => ({
  kind: "grocery",
  id: "g1",
  foodId: "chicken_thigh",
  purchasedOn: MON,
  storage: "fridge",
  opened: false,
  ...overrides,
});

describe("expiresOn: the start day counts as day 1", () => {
  it("raw chicken (2 days in the fridge) bought Monday is good through Tuesday", () => {
    expect(expiresOn(grocery())).toBe("2026-09-22");
  });

  it("leftovers cooked Monday are good through Thursday (4-day rule)", () => {
    const chili: PantryItem = {
      kind: "leftover", id: "l1", mealName: "Chili", foodIds: ["black_beans"], cookedOn: MON, storage: "fridge", portionsLeft: 2,
    };
    expect(expiresOn(chili)).toBe("2026-09-24");
    expect(isGoodOn(chili, "2026-09-24")).toBe(true);
    expect(isGoodOn(chili, "2026-09-25")).toBe(false);
  });

  it("leftovers left out at room temperature are never safe (2-hour rule)", () => {
    const leftOut: PantryItem = {
      kind: "leftover", id: "l2", mealName: "Rice", foodIds: ["white_rice"], cookedOn: MON, storage: "pantry", portionsLeft: 1,
    };
    expect(isGoodOn(leftOut, MON)).toBe(false);
  });

  it("the freezer extends life", () => {
    expect(expiresOn(grocery({ storage: "freezer" }))).toBe(addDays(MON, 269));
  });

  it("opening shortens life: whichever comes first wins", () => {
    // Greek yogurt: 14 days unopened, 5 once opened.
    const opened = grocery({ foodId: "greek_yogurt", opened: true, openedOn: "2026-09-23" });
    expect(expiresOn(opened)).toBe("2026-09-27");
    // Opened on day 12: the unopened date (day 14) is still the limit.
    const lateOpen = grocery({ foodId: "greek_yogurt", opened: true, openedOn: addDays(MON, 12) });
    expect(expiresOn(lateOpen)).toBe(addDays(MON, 13));
  });

  it("opened shelf-stable milk left in the pantry uses the (shorter) fridge value", () => {
    const soyMilk = grocery({ foodId: "soy_milk", storage: "pantry", opened: true, openedOn: MON });
    expect(expiresOn(soyMilk)).toBe(addDays(MON, 6));
  });

  it("a fridge food left in the pantry is unsafe right away", () => {
    expect(isGoodOn(grocery({ foodId: "egg", storage: "pantry" }), MON)).toBe(false);
  });

  it("a pantry food moved to the fridge keeps its pantry life", () => {
    expect(expiresOn(grocery({ foodId: "black_beans", storage: "fridge" }))).toBe(addDays(MON, 729));
  });

  it("a date from the label always wins", () => {
    expect(expiresOn(grocery({ expiresOnOverride: "2026-10-01" }))).toBe("2026-10-01");
  });
});

describe("freshness states", () => {
  it("goes ok → soon → last day → expired", () => {
    const yogurt = grocery({ foodId: "greek_yogurt" }); // good through Sep 4 (+13)
    expect(freshness(yogurt, MON).state).toBe("ok");
    expect(freshness(yogurt, addDays(MON, 11)).state).toBe("soon");
    expect(freshness(yogurt, addDays(MON, 13))).toMatchObject({ state: "last_day", daysLeft: 0 });
    expect(freshness(yogurt, addDays(MON, 14))).toMatchObject({ state: "expired", daysLeft: -1 });
  });

  it("usablePantry drops anything past its date", () => {
    const pantry = [grocery({ id: "chicken" }), grocery({ id: "rice", foodId: "white_rice", storage: "pantry" })];
    expect(usablePantry(pantry, "2026-09-23").map((p) => p.id)).toEqual(["rice"]);
  });

  it("fresh purchases: raw chicken bought Monday won't keep until Thursday", () => {
    expect(freshPurchaseUseBy("chicken_breast", MON)).toBe("2026-09-22");
    expect(freshPurchaseUseBy("white_rice", MON) > "2027-01-01").toBe(true);
  });
});

describe("demo personas over time", () => {
  const today = "2026-09-25";

  it.each(["arjun", "jae"])("%s: the chicken is fine today, expired 2 days later", (id) => {
    const { pantry } = getPersona(id)!.build(today);
    const chicken = pantry.find((p) => p.kind === "grocery" && p.foodId.includes("chicken"))!;
    expect(freshness(chicken, today).state).toBe("soon"); // good through tomorrow → heads-up
    expect(freshness(chicken, addDays(today, 2)).state).toBe("expired");
    expect(usablePantry(pantry, addDays(today, 2))).not.toContainEqual(chicken);
  });

  it("sofia: the leftover chili is good through tomorrow, then gone", () => {
    const { pantry } = getPersona("sofia")!.build(today);
    const chili = pantry.find((p) => p.kind === "leftover")!;
    expect(freshness(chili, today)).toMatchObject({ state: "soon", daysLeft: 1 });
    expect(isGoodOn(chili, addDays(today, 2))).toBe(false);
  });

  it("no persona starts with anything already expired", () => {
    for (const id of ["jae", "arjun", "sofia"]) {
      const { pantry } = getPersona(id)!.build(today);
      expect(usablePantry(pantry, today)).toHaveLength(pantry.length);
    }
  });
});
