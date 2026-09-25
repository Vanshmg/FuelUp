/** Chicken, turkey, and duck are separate; "poultry" is a shortcut for all three. */
import { describe, expect, it } from "vitest";
import { FOOD_LIST } from "@/lib/data/foods";
import { collapseTags, expandTags } from "@/lib/data/tagGroups";
import { getPersona } from "@/lib/data/personas";
import { parseSavedState } from "@/lib/storage";
import { emptyState } from "@/lib/types";
import { checkMealAllergens, effectiveAvoidTags, tagsInText } from "./allergens";
import { checkWeeklyLimits } from "./limits";
import { meal, planFrom } from "./testHelpers";

const turkeyWrap = () => meal("Turkey wrap", ["deli_turkey", "flour_tortilla"]);
const chickenWrap = () => meal("Chicken wrap", ["chicken_breast", "flour_tortilla"]);

describe("poultry split", () => {
  it("never turkey blocks turkey but allows chicken (your case)", () => {
    expect(checkMealAllergens(turkeyWrap(), ["turkey"], []).map((i) => [i.code, i.tag])).toEqual([["hard_avoid", "turkey"]]);
    expect(checkMealAllergens(chickenWrap(), ["turkey"], [])).toEqual([]);
  });

  it("never poultry blocks all three, including duck by name", () => {
    const avoid = effectiveAvoidTags({ diet: "none", avoidTags: ["poultry"] });
    expect(avoid.sort()).toEqual(["chicken", "duck", "turkey"]);
    expect(checkMealAllergens(turkeyWrap(), ["poultry"], [])).toHaveLength(1);
    expect(checkMealAllergens(chickenWrap(), ["poultry"], [])).toHaveLength(1);
    expect(checkMealAllergens(meal("Duck bao", ["frozen_veggie_dumplings"]), avoid, []).map((i) => i.tag)).toEqual(["duck"]);
  });

  it("vegetarian still avoids chicken, turkey, and duck", () => {
    const avoid = effectiveAvoidTags({ diet: "vegetarian", avoidTags: [] });
    expect(avoid).toEqual(expect.arrayContaining(["chicken", "turkey", "duck"]));
    expect(checkMealAllergens(meal("Duck bao", ["frozen_veggie_dumplings"]), avoid, [])).toHaveLength(1);
  });

  it("'poultry' in a meal name counts for each member; 'poultry seasoning' doesn't", () => {
    expect(tagsInText("Poultry stir fry", ["turkey"])).toEqual(["turkey"]);
    expect(tagsInText("Roast potatoes with poultry seasoning", ["chicken", "turkey"])).toEqual([]);
  });

  it("a poultry LIMIT counts chicken and turkey meals together", () => {
    const FRI = "2026-09-25";
    const plan = planFrom(FRI, [[chickenWrap()], [turkeyWrap()], [chickenWrap()]]);
    const issues = checkWeeklyLimits(plan, [], [{ tag: "poultry", maxPerWeek: 2 }], FRI);
    expect(issues.map((i) => i.date)).toEqual(["2026-09-27"]); // the 3rd poultry meal
    // A chicken-only limit ignores the turkey meal.
    expect(checkWeeklyLimits(plan, [], [{ tag: "chicken", maxPerWeek: 2 }], FRI)).toEqual([]);
  });

  it("an old saved profile that says 'poultry' still loads and still blocks turkey", () => {
    const profile = { ...getPersona("jae")!.build(FRI_DATE).profile!, avoidTags: ["peanut", "poultry"] };
    const { state, notices } = parseSavedState(JSON.stringify({ ...emptyState(), profile }));
    expect(notices).toEqual([]);
    expect(checkMealAllergens(turkeyWrap(), effectiveAvoidTags(state.profile!), [])).toHaveLength(1);
  });

  it("Arjun eats chicken but not turkey or duck", () => {
    const avoid = effectiveAvoidTags(getPersona("arjun")!.build(FRI_DATE).profile!);
    expect(avoid).toEqual(expect.arrayContaining(["turkey", "duck"]));
    expect(avoid).not.toContain("chicken");
  });

  it("foods are tagged with the specific bird, never the group", () => {
    for (const [id, food] of FOOD_LIST) {
      expect(food.contains, id).not.toContain("poultry");
      expect(food.mayContain ?? [], id).not.toContain("poultry");
    }
  });

  it("expands and collapses groups for display", () => {
    expect(expandTags(["poultry", "egg"])).toEqual(["chicken", "turkey", "duck", "egg"]);
    expect(collapseTags(["egg", "chicken", "turkey", "duck"])).toEqual(["egg", "poultry"]);
    expect(collapseTags(["chicken", "duck"])).toEqual(["chicken", "duck"]);
  });
});

const FRI_DATE = "2026-09-25";
