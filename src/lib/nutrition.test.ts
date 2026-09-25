import { describe, expect, it } from "vitest";
import { dayTotals, mealNutrition } from "@/lib/nutrition";
import { meal } from "@/lib/safety/testHelpers";

describe("nutrition estimates", () => {
  it("sums catalog nutrition per portion, rounded", () => {
    // 2 eggs (140 kcal, 12g) + 2 slices bread (200 kcal, 8g)
    expect(mealNutrition(meal("Eggs on toast", ["egg", "whole_wheat_bread"]))).toEqual({
      kcal: 340, protein: 20, carbs: 37, fat: 13,
    });
  });

  it("scales by servings", () => {
    const m = meal("Double eggs", ["egg"]);
    m.items[0].servings = 2;
    expect(mealNutrition(m).protein).toBe(24);
  });

  it("totals a day", () => {
    const totals = dayTotals({ meals: [meal("A", ["egg"]), meal("B", ["banana"])] });
    expect(totals).toEqual({ kcal: 250, protein: 13, cost: 0.97 });
  });
});
