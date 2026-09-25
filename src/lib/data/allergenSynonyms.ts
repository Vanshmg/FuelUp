/**
 * Words that signal an avoid tag when they appear in free text: a meal name,
 * a recipe query, or something the user typed.
 *
 * This is the SECOND layer of allergen defense. The first layer is the catalog
 * tags on each ingredient. This layer catches cases like a meal named
 * "French toast" whose ingredient list somehow left out egg.
 *
 * Matching is whole-word and case-insensitive (so "eggplant" does not match
 * "egg"). Phrases like "egg-free" are handled by the checker, not here.
 *
 * To extend: add lowercase words or phrases to the right list.
 */
import type { AvoidTag } from "@/lib/types";

export const ALLERGEN_SYNONYMS: Record<AvoidTag, string[]> = {
  peanut: ["peanut", "peanuts", "satay", "groundnut", "kung pao", "pad thai", "mole", "pb&j", "pbj"],
  tree_nut: [
    "almond", "almonds", "cashew", "cashews", "walnut", "walnuts", "pecan", "pecans", "pistachio",
    "pistachios", "hazelnut", "hazelnuts", "macadamia", "pine nut", "pine nuts", "pesto", "praline",
    "marzipan", "nutella", "korma", "baklava", "badam", "kaju",
  ],
  dairy: [
    "milk", "cheese", "butter", "ghee", "paneer", "cream", "yogurt", "yoghurt", "whey", "casein",
    "lassi", "raita", "queso", "tzatziki", "alfredo", "kheer", "dahi", "curd", "custard", "parmesan",
    "mozzarella", "cheddar", "feta", "ricotta", "quesadilla", "mac and cheese", "malai", "makhani",
  ],
  egg: [
    "egg", "eggs", "omelet", "omelette", "frittata", "mayo", "mayonnaise", "aioli", "french toast",
    "quiche", "custard", "meringue", "shakshuka", "carbonara", "hollandaise", "egg roll", "anda",
    "bhurji", "caesar", "tamagoyaki", "kewpie",
  ],
  soy: ["soy", "soya", "tofu", "edamame", "tempeh", "miso", "shoyu", "tamari", "teriyaki", "natto"],
  wheat: [
    "wheat", "flour", "bread", "toast", "pasta", "noodle", "noodles", "naan", "roti", "chapati",
    "paratha", "seitan", "couscous", "bagel", "pita", "croissant", "ramen", "udon", "spaghetti",
    "dumpling", "dumplings", "breaded", "tempura", "panko", "cracker", "crackers",
  ],
  fish: [
    "fish", "salmon", "tuna", "anchovy", "anchovies", "cod", "tilapia", "sardine", "sardines",
    "fish sauce", "bonito", "dashi", "caesar", "kimchi", "mackerel",
  ],
  shellfish: [
    "shrimp", "prawn", "prawns", "crab", "lobster", "clam", "clams", "mussel", "mussels", "oyster",
    "scallop", "scallops", "shrimp paste",
  ],
  sesame: ["sesame", "tahini", "hummus", "za'atar", "zaatar", "gomasio", "halva"],
  chocolate: ["chocolate", "cocoa", "cacao", "mocha", "brownie", "brownies", "fudge", "nutella"],
  // "poultry" is a group tag: checks expand it to chicken + turkey + duck,
  // so it needs no words of its own. "Poultry" in a name counts for all three.
  poultry: [],
  chicken: ["chicken", "murgh", "poultry"],
  turkey: ["turkey", "poultry"],
  duck: ["duck", "poultry"],
  beef: ["beef", "steak", "bulgogi", "brisket", "carne asada", "barbacoa", "galbi", "pho bo"],
  pork: ["pork", "bacon", "ham", "chorizo", "carnitas", "prosciutto", "pepperoni", "salami", "char siu"],
  lamb: ["lamb", "mutton", "gyro", "keema"],
};

/**
 * Phrases that contain a trigger word but are NOT that allergen.
 * The checker removes these from the text before scanning, so
 * "peanut butter" isn't flagged as dairy and "soy yogurt" isn't dairy.
 * Only add phrases here when you're sure; a false alarm is safer than a miss.
 */
export const SAFE_PHRASES: Partial<Record<AvoidTag, string[]>> = {
  dairy: [
    "peanut butter", "almond butter", "cashew butter", "cocoa butter", "apple butter",
    "coconut milk", "coconut cream", "oat milk", "soy milk", "almond milk", "rice milk",
    "soy yogurt", "coconut yogurt", "dairy-free", "dairy free", "non-dairy", "vegan cheese", "bean curd",
  ],
  egg: ["egg-free", "egg free", "eggless", "vegan mayo"],
  wheat: ["rice noodles", "rice noodle", "glass noodles", "corn tortilla", "gluten-free", "gluten free"],
  // Poultry seasoning is herbs (sage, thyme), not poultry.
  chicken: ["poultry seasoning"],
  turkey: ["poultry seasoning"],
  duck: ["poultry seasoning"],
};
