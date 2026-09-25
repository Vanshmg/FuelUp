import { describe, expect, it } from "vitest";
import { FOOD_LIST, FOODS, getFood } from "@/lib/data/foods";
import { ALLERGEN_SYNONYMS, SAFE_PHRASES } from "@/lib/data/allergenSynonyms";
import { lookupFood, normalizeFoodText } from "@/lib/foodLookup";
import { AVOID_TAGS } from "@/lib/types";

describe("food catalog", () => {
  it("has a broad catalog", () => {
    expect(FOOD_LIST.length).toBeGreaterThanOrEqual(100);
  });

  it("uses snake_case ids", () => {
    for (const [id] of FOOD_LIST) expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("never maps one alias to two different foods", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const [id, food] of FOOD_LIST) {
      for (const alias of food.aliases) {
        const key = normalizeFoodText(alias);
        const owner = seen.get(key);
        if (owner && owner !== id) clashes.push(`"${alias}" → ${owner} and ${id}`);
        seen.set(key, id);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("has a shelf life for the storage each food usually goes in", () => {
    for (const [id, food] of FOOD_LIST) {
      expect(food.shelfLife[food.storage], `${id} has no ${food.storage} shelf life`).toBeGreaterThan(0);
    }
  });

  it("has sensible prices and servings", () => {
    for (const [id, food] of FOOD_LIST) {
      expect(food.price.cost, id).toBeGreaterThan(0);
      expect(food.price.servings, id).toBeGreaterThan(0);
    }
  });

  it("has calories roughly consistent with its macros", () => {
    for (const [id, { nutrition }] of FOOD_LIST) {
      const fromMacros = nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fat * 9;
      // Estimates are rough; just catch typos like an extra zero.
      expect(Math.abs(fromMacros - nutrition.kcal), id).toBeLessThanOrEqual(Math.max(40, nutrition.kcal * 0.25));
    }
  });

  it("doesn't list a tag as both 'contains' and 'may contain'", () => {
    for (const [id, food] of FOOD_LIST) {
      const overlap = (food.mayContain ?? []).filter((tag) => food.contains.includes(tag));
      expect(overlap, id).toEqual([]);
    }
  });

  it("tags the classic hidden-allergen foods", () => {
    expect(FOODS.mayo.contains).toContain("egg");
    expect(FOODS.pesto.contains).toContain("tree_nut");
    expect(FOODS.peanut_sauce.contains).toContain("peanut");
    expect(FOODS.fish_sauce.contains).toContain("fish");
    expect(FOODS.soy_sauce.contains).toEqual(expect.arrayContaining(["soy", "wheat"]));
    expect(FOODS.granola.mayContain).toContain("peanut");
    expect(FOODS.protein_bar.mayContain).toContain("peanut");
    expect(FOODS.ghee.contains).toContain("dairy");
    expect(FOODS.kimchi.contains).toContain("fish");
  });
});

describe("lookupFood (the 'scrambled eggs' example)", () => {
  it("turns typed text into a catalog id, ignoring case and spacing", () => {
    expect(lookupFood("Scrambled eggs")).toBe("egg");
    expect(lookupFood("  EGG   bhurji ")).toBe("egg");
    expect(lookupFood("chicken_thigh")).toBe("chicken_thigh");
    expect(lookupFood("chicken thigh")).toBe("chicken_thigh");
  });

  it("gives the id whose tags the safety check will use", () => {
    const id = lookupFood("scrambled eggs");
    expect(id && getFood(id).contains).toContain("egg");
  });

  it("returns undefined instead of guessing", () => {
    expect(lookupFood("pad thai sauce")).toBeUndefined();
    expect(lookupFood("soup")).toBeUndefined();
  });
});

describe("allergen synonyms", () => {
  it("has a lowercase word list for every tag", () => {
    for (const tag of AVOID_TAGS) {
      if (tag === "poultry") continue; // a group tag: its members carry the words
      expect(ALLERGEN_SYNONYMS[tag].length, tag).toBeGreaterThan(0);
      for (const word of ALLERGEN_SYNONYMS[tag]) expect(word).toBe(word.toLowerCase());
    }
    for (const phrases of Object.values(SAFE_PHRASES)) {
      for (const phrase of phrases) expect(phrase).toBe(phrase.toLowerCase());
    }
  });

  it("covers the spec's examples", () => {
    expect(ALLERGEN_SYNONYMS.egg).toEqual(expect.arrayContaining(["mayo", "omelette", "french toast"]));
    expect(ALLERGEN_SYNONYMS.peanut).toContain("satay");
    expect(ALLERGEN_SYNONYMS.dairy).toEqual(expect.arrayContaining(["whey", "casein", "ghee"]));
    expect(ALLERGEN_SYNONYMS.chocolate).toEqual(expect.arrayContaining(["cocoa", "mocha", "brownie"]));
  });
});

describe("lookupFood near-misses: a longer name never matches a shorter food", () => {
  it.each([
    ["peanut butter cookies", undefined], // not "cookies" (would hide peanut)
    ["chicken soup", undefined], // not "chicken"
    ["egg fried rice", undefined], // not "egg" or "rice"
    ["almond milk", undefined], // not "milk" (different allergen!)
    ["chocolate milk", undefined],
    ["eggplant", undefined],
    ["doritos", undefined], // cheese-flavored: not plain chips
    ["hot cheetos", undefined],
    ["kitkat", undefined], // contains wheat + dairy: not dark chocolate
  ])('"%s" → unknown', (text, expected) => {
    expect(lookupFood(text)).toBe(expected);
  });

  it.each([
    ["tortilla chips", "tortilla_chips"], // its own food now, not potato chips
    ["chips", "chips"],
    ["cookies", "chocolate_chip_cookies"],
    ["coconut milk", "coconut_milk"], // the full phrase is its own food
    ["soy milk", "soy_milk"],
    ["milk", "milk"],
  ])('"%s" → %s', (text, expected) => {
    expect(lookupFood(text)).toBe(expected);
  });
});

describe("high-risk foods (raw meat, poultry, fish, eggs, dairy)", () => {
  const RISKY_TAGS = ["chicken", "turkey", "duck", "beef", "pork", "lamb", "fish", "shellfish", "egg", "dairy"];

  it("flags every perishable protein or dairy food made from them", () => {
    for (const [id, food] of FOOD_LIST) {
      const risky = food.contains.some((tag) => RISKY_TAGS.includes(tag));
      const perishable = food.storage !== "pantry";
      if ((food.role === "protein" || food.role === "dairy") && risky && perishable) {
        expect(food.highRisk, `${id} should be highRisk`).toBe(true);
      }
    }
  });

  it("gives every high-risk food a storage tip", () => {
    for (const [id, food] of FOOD_LIST) {
      if (food.highRisk) expect(food.storageTip?.length, id).toBeGreaterThan(20);
    }
  });

  it("matches the low end of USDA ranges (start day = day 1)", () => {
    // FDA/USDA chart: fresh poultry & ground meat 1–2 days, eggs 3–5 weeks,
    // cooked poultry 3–4 days, lunch meat opened 3–5 days; FSIS: milk 7 days,
    // yogurt 1–2 weeks, soft cheese 1 week, hard cheese opened 3–4 weeks.
    expect(FOODS.chicken_thigh.shelfLife.fridge).toBe(2);
    expect(FOODS.ground_beef.shelfLife.fridge).toBe(2);
    expect(FOODS.salmon.shelfLife.fridge).toBe(2);
    expect(FOODS.egg.shelfLife.fridge).toBe(21);
    expect(FOODS.rotisserie_chicken.shelfLife.fridge).toBe(4);
    expect(FOODS.deli_turkey.shelfLife.opened.fridge).toBe(4);
    expect(FOODS.milk.shelfLife.fridge).toBe(7);
    expect(FOODS.greek_yogurt.shelfLife.fridge).toBe(7);
    expect(FOODS.cottage_cheese.shelfLife.fridge).toBe(7);
    expect(FOODS.cheddar.shelfLife.opened.fridge).toBe(21);
  });

  it("doesn't flag produce", () => {
    expect(getFood("spinach").highRisk).toBeUndefined();
    expect(getFood("berries").highRisk).toBeUndefined();
  });
});
