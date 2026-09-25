import { describe, expect, it } from "vitest";
import { AVOID_OPTIONS, CUISINE_OPTIONS, DIET_OPTIONS, EFFORT_OPTIONS } from "@/lib/data/labels";
import { FOOD_LIST } from "@/lib/data/foods";
import { foodEmoji } from "@/lib/data/icons";
import { AVOID_TAGS, CuisineSchema, DietSchema, EffortLevelSchema } from "@/lib/types";

describe("labels and icons", () => {
  it("has a label for every choice", () => {
    expect(Object.keys(EFFORT_OPTIONS).sort()).toEqual([...EffortLevelSchema.options].sort());
    expect(Object.keys(CUISINE_OPTIONS).sort()).toEqual([...CuisineSchema.options].sort());
    expect(Object.keys(DIET_OPTIONS).sort()).toEqual([...DietSchema.options].sort());
    expect(Object.keys(AVOID_OPTIONS).sort()).toEqual([...AVOID_TAGS].sort());
  });

  it("gives every food an icon, falling back to its role", () => {
    for (const [id, food] of FOOD_LIST) expect(foodEmoji(food), id).toBeTruthy();
    expect(foodEmoji({ role: "legume" })).toBe("🫘");
  });
});
