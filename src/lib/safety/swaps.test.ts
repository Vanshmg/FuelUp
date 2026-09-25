import { describe, expect, it } from "vitest";
import { getFood } from "@/lib/data/foods";
import { cheaperCandidates } from "./swaps";

describe("cheaperCandidates", () => {
  it("chicken breast → chicken thighs first (same family)", () => {
    const [first] = cheaperCandidates("chicken_breast", []);
    expect(first).toMatchObject({ foodId: "chicken_thigh", closeness: "same_family" });
    expect(first.savingsPerServing).toBeGreaterThan(0);
  });

  it("never leaves the ingredient role (no chicken → spinach)", () => {
    for (const swap of cheaperCandidates("chicken_breast", [], [], 20)) {
      expect(getFood(swap.foodId).role).toBe("protein");
    }
  });

  it("only offers foods that pass the allergen check", () => {
    const swaps = cheaperCandidates("chicken_breast", ["poultry", "egg", "soy"], [], 20);
    expect(swaps.map((s) => s.foodId)).not.toContain("chicken_thigh");
    expect(swaps.map((s) => s.foodId)).not.toContain("egg");
    expect(swaps.map((s) => s.foodId)).not.toContain("tofu");
  });

  it("returns nothing when nothing cheaper is allowed", () => {
    expect(cheaperCandidates("white_rice", [])).toEqual([]);
  });
});
