import { describe, expect, it } from "vitest";
import type { GroceryListItem, PantryItem } from "@/lib/types";
import { budgetBreakdown, budgetStatus, formatUsd, groceryNeeds, listTotal, mealCost, packagesFor, spentThisWeek, sumPrices } from "./budget";
import { meal, planFrom } from "./testHelpers";

const line = (price: number): GroceryListItem => ({ foodId: "egg", packages: 1, price, priceEdited: false, bought: false });

describe("money math in cents", () => {
  it("adds prices without floating-point errors", () => {
    expect(sumPrices([0.1, 0.2])).toBe(0.3);
    expect(listTotal([line(3.99), line(2.49), line(1.19)])).toBe(7.67);
  });

  it("formats dollars", () => {
    expect(formatUsd(12.5)).toBe("$12.50");
    expect(formatUsd(-3.2)).toBe("-$3.20");
    expect(formatUsd(45)).toBe("$45");
  });

  it("reports what's left and whether you're over", () => {
    expect(budgetStatus(40, 33.8)).toEqual({ budget: 40, spent: 33.8, remaining: 6.2, over: false });
    expect(budgetStatus(40, 41.25)).toMatchObject({ remaining: -1.25, over: true });
    expect(budgetStatus(40, 40).over).toBe(false);
  });
});

describe("meal cost vs grocery cost", () => {
  it("meal cost is the per-serving share", () => {
    // Eggs: $3.99 / 6 servings = 67¢. Bread: $3.49 / 10 = 35¢.
    expect(mealCost(meal("Eggs on toast", ["egg", "whole_wheat_bread"]))).toBe(1.02);
  });

  it("buys whole packages", () => {
    expect(packagesFor("egg", 6)).toBe(1); // exactly one dozen
    expect(packagesFor("egg", 7)).toBe(2);
    expect(packagesFor("egg", 0)).toBe(0);
  });

  it("counts batch portions, skips leftovers, and skips food already at home", () => {
    const batch = meal("Chili", ["black_beans", "onion"], { portions: 3 });
    const leftovers = meal("Chili again", ["black_beans", "onion"], { leftoverOf: batch.id });
    const plan = planFrom("2026-09-21", [[batch], [leftovers]]);
    const onionAtHome: PantryItem = {
      kind: "grocery", id: "o", foodId: "onion", purchasedOn: "2026-09-20", storage: "pantry", opened: false,
    };

    const needs = groceryNeeds(plan, [onionAtHome]);
    expect(needs).toEqual([{ foodId: "black_beans", servings: 3, packages: 1, price: 1.19 }]);
  });

  it("an expired item at home doesn't count as covered", () => {
    const plan = planFrom("2026-09-25", [[meal("Chicken bowl", ["chicken_thigh"])]]);
    const oldChicken: PantryItem = {
      kind: "grocery", id: "c", foodId: "chicken_thigh", purchasedOn: "2026-09-18", storage: "fridge", opened: false,
    };
    expect(groceryNeeds(plan, [oldChicken]).map((n) => n.foodId)).toEqual(["chicken_thigh"]);
  });

  it("sums only what was actually paid this week", () => {
    const bought = (purchasedOn: string, pricePaid?: number): PantryItem => ({
      kind: "grocery", id: purchasedOn, foodId: "egg", purchasedOn, storage: "fridge", opened: false,
      ...(pricePaid !== undefined && { pricePaid }),
    });
    const pantry = [bought("2026-09-19", 5), bought("2026-09-21", 3.99), bought("2026-09-23", 2.5), bought("2026-09-24")];
    expect(spentThisWeek(pantry, "2026-09-25", "2026-09-21")).toBe(6.49);
  });
});

describe("budget realism", () => {
  it("treats staples (spices, oils) as already at home", () => {
    const plan = planFrom("2026-09-25", [[meal("Dal", ["red_lentils", "cumin", "garam_masala", "olive_oil"])]]);
    expect(groceryNeeds(plan, []).map((n) => n.foodId)).toEqual(["red_lentils"]);
  });

  it("names the priciest packages and their unused servings", () => {
    const plan = planFrom("2026-09-25", [[meal("Protein bar", ["protein_bar"]), meal("Eggs", ["egg"])]]);
    const breakdown = budgetBreakdown(plan, []);
    expect(breakdown.total).toBe(23.98);
    expect(breakdown.items[0]).toMatchObject({ foodId: "protein_bar", price: 19.99, unusedServings: 11 });
  });
});
