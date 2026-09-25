import { describe, expect, it } from "vitest";
import { checkMealAllergens, effectiveAvoidTags, isFoodAllowed, tagsInText } from "./allergens";
import { meal } from "./testHelpers";

describe("tagsInText (second layer: scanning meal names)", () => {
  it("catches hidden allergens by name", () => {
    expect(tagsInText("French toast with berries", ["egg"])).toEqual(["egg"]);
    expect(tagsInText("Chicken satay skewers", ["peanut"])).toEqual(["peanut"]);
    expect(tagsInText("Mocha overnight oats", ["chocolate"])).toEqual(["chocolate"]);
    expect(tagsInText("Whey protein shake", ["dairy"])).toEqual(["dairy"]);
    expect(tagsInText("Aloo paratha with ghee", ["dairy"])).toEqual(["dairy"]);
  });

  it("matches whole words and plurals only", () => {
    expect(tagsInText("Eggplant parmesan", ["egg"])).toEqual([]);
    expect(tagsInText("Deviled eggs", ["egg"])).toEqual(["egg"]);
    expect(tagsInText("Guacamole and chips", ["peanut"])).toEqual([]); // "mole" inside a word
    expect(tagsInText("Hamburger", ["pork"])).toEqual([]); // "ham" inside a word
  });

  it("doesn't flag phrases that only look like an allergen", () => {
    expect(tagsInText("Peanut butter toast", ["dairy"])).toEqual([]);
    expect(tagsInText("Coconut milk curry", ["dairy"])).toEqual([]);
    expect(tagsInText("Soy yogurt parfait", ["dairy"])).toEqual([]);
    expect(tagsInText("Egg-free brownie", ["egg"])).toEqual([]);
    expect(tagsInText("Rice noodle soup", ["wheat"])).toEqual([]);
  });

  it("still flags the real allergen next to a safe phrase", () => {
    expect(tagsInText("Peanut butter toast", ["peanut", "wheat"])).toEqual(["peanut", "wheat"]);
    expect(tagsInText("Egg-free brownie", ["chocolate"])).toEqual(["chocolate"]);
    // Fails closed: "dairy-free ice cream" still says cream. A false alarm beats a miss.
    expect(tagsInText("Dairy-free ice cream", ["dairy"])).toEqual(["dairy"]);
  });
});

describe("effectiveAvoidTags", () => {
  it("adds everything the diet implies", () => {
    expect(effectiveAvoidTags({ diet: "vegetarian", avoidTags: ["dairy"] }).sort()).toEqual(
      ["beef", "chicken", "dairy", "duck", "fish", "lamb", "pork", "shellfish", "turkey"].sort(),
    );
    expect(effectiveAvoidTags({ diet: "none", avoidTags: ["peanut"] })).toEqual(["peanut"]);
  });
});

describe("checkMealAllergens", () => {
  it("blocks Jae's granola parfait: granola MAY contain peanuts", () => {
    const issues = checkMealAllergens(meal("Greek yogurt parfait", ["greek_yogurt", "granola"]), ["peanut"], []);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "may_contain", severity: "block", foodId: "granola", tag: "peanut" });
  });

  it("blocks Sofia's naan (dairy) and chicken (vegetarian)", () => {
    const avoid = effectiveAvoidTags({ diet: "vegetarian", avoidTags: ["dairy"] });
    const issues = checkMealAllergens(meal("Chicken tikka with naan", ["chicken_thigh", "naan"]), avoid, []);
    expect(issues.map((i) => [i.code, i.tag])).toEqual([
      ["hard_avoid", "chicken"],
      ["hard_avoid", "dairy"],
    ]);
  });

  it("catches an allergen that's only in the meal name", () => {
    const issues = checkMealAllergens(meal("French toast", ["whole_wheat_bread", "milk"]), ["egg"], []);
    // Bread MAY contain egg → blocked by tag; the name is not reported twice for the same tag.
    expect(issues.map((i) => i.code)).toEqual(["may_contain"]);

    const byName = checkMealAllergens(meal("Mayo chicken wrap", ["chicken_breast", "flour_tortilla"]), ["egg"], []);
    expect(byName.map((i) => i.code)).toEqual(["name_mentions"]);
  });

  it("blocks a specifically avoided food", () => {
    const issues = checkMealAllergens(meal("Mushroom stir fry", ["mushrooms", "white_rice"]), [], ["mushrooms"]);
    expect(issues.map((i) => i.code)).toEqual(["avoid_food"]);
  });

  it("passes a safe meal", () => {
    expect(checkMealAllergens(meal("Rice and beans", ["white_rice", "black_beans", "salsa"]), ["peanut", "dairy"], [])).toEqual([]);
  });

  it("writes friendly messages with the day and slot", () => {
    const [issue] = checkMealAllergens(meal("Pad thai", ["peanut_sauce"], { slot: "lunch" }), ["peanut"], [], "2026-09-29");
    expect(issue.message).toBe('Tue lunch: "Pad thai" uses Peanut sauce, which contains peanuts.');
  });
});

describe("isFoodAllowed", () => {
  it("rejects contains, may-contain, and avoided foods", () => {
    expect(isFoodAllowed("trail_mix", ["peanut"], [])).toBe(false);
    expect(isFoodAllowed("protein_bar", ["peanut"], [])).toBe(false); // may contain
    expect(isFoodAllowed("banana", [], ["banana"])).toBe(false);
    expect(isFoodAllowed("banana", ["peanut"], [])).toBe(true);
  });
});
