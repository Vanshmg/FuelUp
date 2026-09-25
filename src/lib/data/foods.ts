/**
 * The curated food catalog: the single source of truth for every food FuelUp
 * can suggest.
 *
 * Why a catalog? Safety. The allergen check can only verify foods it knows.
 * Anything the app suggests must be built from these ids; the AI is not allowed
 * to invent ingredients.
 *
 * Each entry holds:
 * - `contains`: allergens/animal groups that are definitely in the food.
 * - `mayContain`: common in some brands or cross-contact. Hard avoids treat
 *   this as a FAIL (safety first); weekly limits don't count it.
 * - `shelfLife`: days, by storage, for a typical unopened item; `opened` for
 *   items where opening changes it. These are estimates: "Check the label,
 *   look, and smell."
 *
 *   How the numbers map to USDA ranges: the day you buy or cook something
 *   counts as day 1, so N days means "good through N - 1 days after".
 *   We pick N so the last good day is the LOW end of the USDA range.
 *   e.g. raw chicken "1–2 days" → N = 2 → bought Monday, good through Tuesday.
 *
 *   Sources for HIGH-RISK foods (meat, poultry, fish, eggs, dairy):
 *   - FDA/USDA "Refrigerator & Freezer Storage Chart" (March 2018),
 *     https://www.fda.gov/media/74435/download — meat, poultry, fish, eggs,
 *     deli, frozen entrees, leftovers.
 *   - USDA FSIS "How long can you keep dairy products like yogurt, milk, and
 *     cheese in the refrigerator?" (FoodKeeper data),
 *     https://ask.fsis.usda.gov/article/How-long-can-you-keep-dairy-products-like-yogurt-milk-and-cheese-in-the-refrigerator
 *     — milk 7 days, yogurt 1–2 weeks, soft cheese 1 week, hard cheese
 *     6 months unopened / 3–4 weeks opened.
 *   Freezer times are for quality (0°F keeps food safe indefinitely).
 *   Items with no USDA row (paneer, tzatziki, string cheese) use the closest
 *   category (soft cheese / yogurt).
 * - `nutrition`: per `serving`, rough estimates for pattern insights.
 * - `price`: typical US grocery package price in USD, and how many servings
 *   a package gives. Per-serving cost = cost / servings (computed by code).
 *
 * To add a food: copy a similar entry, pick a unique snake_case id, and make
 * sure its aliases don't clash with another food (a test checks this).
 *
 * Alias rule: an alias must name the SAME product. Never alias a brand or
 * variant that can have allergens this entry doesn't list (e.g. "Doritos"
 * are cheese-flavored, so they are NOT an alias of plain chips). Unmatched
 * text is safer than a wrong match: it becomes an estimate, not a guess.
 */
import type { Aisle, AvoidTag, FoodRole, Nutrition, StorageLocation } from "@/lib/types";

export interface ShelfLife {
  pantry?: number;
  fridge?: number;
  freezer?: number;
  opened?: { pantry?: number; fridge?: number };
}

export interface FoodDef {
  name: string;
  /** Leave out when no emoji fits; the UI falls back to the role icon. */
  emoji?: string;
  role: FoodRole;
  aisle: Aisle;
  /** Lowercase words people might type. Used to match logs and AI output. */
  aliases: string[];
  contains: AvoidTag[];
  mayContain?: AvoidTag[];
  /** Where it usually goes when you get home. */
  storage: StorageLocation;
  /**
   * Raw meat, poultry, fish, eggs, and dairy: foods where going past the date
   * is a food-safety risk, not just a quality issue. Planning one after its
   * use-by date BLOCKS the meal (produce only warns).
   */
  highRisk?: true;
  /** Short, friendly storage advice shown when a high-risk item is marked bought. */
  storageTip?: string;
  shelfLife: ShelfLife;
  serving: string;
  nutrition: Nutrition;
  price: { package: string; cost: number; servings: number };
}

const n = (kcal: number, protein: number, carbs: number, fat: number): Nutrition => ({
  kcal,
  protein,
  carbs,
  fat,
});

export const FOODS = {
  // ------------------------------------------------------------- Meat & seafood
  chicken_breast: {
    name: "Chicken breast", emoji: "🍗", role: "protein", aisle: "meat_seafood",
    aliases: ["chicken breast", "chicken breasts"],
    contains: ["chicken"], storage: "fridge", shelfLife: { fridge: 2, freezer: 270 },
    highRisk: true,
    storageTip: "Bottom shelf, sealed, so juices can't drip. Cook within 1–2 days or freeze. Thaw in the fridge, never on the counter.",
    serving: "4 oz", nutrition: n(140, 26, 0, 3), price: { package: "1.5 lb pack", cost: 7.49, servings: 6 },
  },
  chicken_thigh: {
    name: "Chicken thighs", emoji: "🍗", role: "protein", aisle: "meat_seafood",
    aliases: ["chicken thigh", "chicken thighs", "chicken"],
    contains: ["chicken"], storage: "fridge", shelfLife: { fridge: 2, freezer: 270 },
    highRisk: true,
    storageTip: "Bottom shelf, sealed, so juices can't drip. Cook within 1–2 days or freeze. Thaw in the fridge, never on the counter.",
    serving: "4 oz", nutrition: n(180, 22, 0, 10), price: { package: "1.5 lb pack", cost: 5.99, servings: 6 },
  },
  rotisserie_chicken: {
    name: "Rotisserie chicken", emoji: "🍗", role: "protein", aisle: "deli_ready",
    aliases: ["rotisserie chicken", "roast chicken"],
    contains: ["chicken"], storage: "fridge", shelfLife: { fridge: 4, freezer: 120 },
    highRisk: true,
    storageTip: "Fridge within 2 hours of buying. Eat within 3–4 days, or pull the meat off the bone and freeze it.",
    serving: "3 oz meat", nutrition: n(170, 23, 0, 8), price: { package: "whole chicken", cost: 7.99, servings: 5 },
  },
  ground_turkey: {
    name: "Ground turkey", emoji: "🦃", role: "protein", aisle: "meat_seafood",
    aliases: ["ground turkey", "turkey mince"],
    contains: ["turkey"], storage: "fridge", shelfLife: { fridge: 2, freezer: 90 },
    highRisk: true,
    storageTip: "Bottom shelf, sealed. Cook within 1–2 days or freeze. Cook until no pink remains (165°F).",
    serving: "4 oz", nutrition: n(170, 22, 0, 9), price: { package: "1 lb", cost: 5.49, servings: 4 },
  },
  ground_beef: {
    name: "Ground beef", emoji: "🥩", role: "protein", aisle: "meat_seafood",
    aliases: ["ground beef", "beef mince", "hamburger meat"],
    contains: ["beef"], storage: "fridge", shelfLife: { fridge: 2, freezer: 90 },
    highRisk: true,
    storageTip: "Bottom shelf, sealed. Cook within 1–2 days or freeze. Cook to 160°F.",
    serving: "4 oz", nutrition: n(290, 19, 0, 23), price: { package: "1 lb", cost: 5.99, servings: 4 },
  },
  beef_sliced: {
    name: "Thin-sliced beef", emoji: "🥩", role: "protein", aisle: "meat_seafood",
    aliases: ["sliced beef", "thin sliced beef", "bulgogi beef", "shaved steak"],
    contains: ["beef"], storage: "fridge", shelfLife: { fridge: 4, freezer: 180 },
    highRisk: true,
    storageTip: "Bottom shelf, sealed. Cook within 3 days or freeze flat in a bag so it thaws fast.",
    serving: "4 oz", nutrition: n(220, 22, 0, 14), price: { package: "1 lb", cost: 8.99, servings: 4 },
  },
  bacon: {
    name: "Bacon", emoji: "🥓", role: "protein", aisle: "meat_seafood",
    aliases: ["bacon"],
    contains: ["pork"], storage: "fridge", shelfLife: { fridge: 7, freezer: 30, opened: { fridge: 7 } },
    highRisk: true,
    storageTip: "Keep sealed in the fridge and use within a week of opening. Freezes well for a month.",
    serving: "2 slices", nutrition: n(90, 6, 0, 7), price: { package: "12 oz pack", cost: 5.99, servings: 8 },
  },
  deli_turkey: {
    name: "Deli turkey", emoji: "🦃", role: "protein", aisle: "deli_ready",
    aliases: ["deli turkey", "turkey slices", "sliced turkey", "turkey"],
    contains: ["turkey"], storage: "fridge", shelfLife: { fridge: 14, freezer: 30, opened: { fridge: 4 } },
    highRisk: true,
    storageTip: "Once opened, eat within 3–5 days. Keep it sealed and cold.",
    serving: "2 oz", nutrition: n(60, 10, 2, 1), price: { package: "8 oz pack", cost: 4.99, servings: 4 },
  },
  salmon: {
    name: "Salmon fillet", emoji: "🐟", role: "protein", aisle: "meat_seafood",
    aliases: ["salmon", "salmon fillet"],
    contains: ["fish"], storage: "fridge", shelfLife: { fridge: 2, freezer: 60 },
    highRisk: true,
    storageTip: "Coldest spot in the fridge, sealed, bottom shelf. Cook within 1–2 days or freeze.",
    serving: "4 oz", nutrition: n(230, 23, 0, 14), price: { package: "2 fillets", cost: 9.99, servings: 2 },
  },
  canned_tuna: {
    name: "Canned tuna", emoji: "🐟", role: "protein", aisle: "pantry",
    aliases: ["tuna", "canned tuna", "tuna can"],
    contains: ["fish"], storage: "pantry", shelfLife: { pantry: 730, opened: { fridge: 4 } },
    highRisk: true,
    storageTip: "Once opened, move leftovers out of the can into a covered container in the fridge. Use within 3–4 days.",
    serving: "1 can", nutrition: n(120, 26, 0, 1), price: { package: "5 oz can", cost: 1.49, servings: 1 },
  },
  shrimp: {
    name: "Frozen shrimp", emoji: "🍤", role: "protein", aisle: "frozen",
    aliases: ["shrimp", "prawns", "frozen shrimp"],
    contains: ["shellfish"], storage: "freezer", shelfLife: { freezer: 90, fridge: 2 },
    highRisk: true,
    storageTip: "Keep frozen. Thaw overnight in the fridge (or sealed, under cold water) and cook within 1–2 days.",
    serving: "4 oz", nutrition: n(110, 23, 1, 1), price: { package: "1 lb bag", cost: 8.99, servings: 4 },
  },

  // ------------------------------------------------------------- Plant protein & eggs
  egg: {
    name: "Eggs", emoji: "🥚", role: "protein", aisle: "dairy_eggs",
    aliases: [
      "egg", "eggs", "scrambled eggs", "scrambled egg", "fried egg", "fried eggs", "boiled egg",
      "boiled eggs", "hard boiled egg", "omelette", "omelet", "egg bhurji", "anda",
    ],
    contains: ["egg"], storage: "fridge", shelfLife: { fridge: 21 },
    highRisk: true,
    storageTip: "Keep in the carton on a shelf, not the door (it's warmer). Cook until yolks are firm.",
    serving: "2 eggs", nutrition: n(140, 12, 1, 10), price: { package: "dozen", cost: 3.99, servings: 6 },
  },
  tofu: {
    name: "Firm tofu", emoji: "🧊", role: "protein", aisle: "plant_protein",
    aliases: ["tofu", "firm tofu", "extra firm tofu"],
    contains: ["soy"], storage: "fridge", shelfLife: { fridge: 30, freezer: 150, opened: { fridge: 3 } },
    serving: "1/4 block", nutrition: n(90, 10, 2, 5), price: { package: "14 oz block", cost: 2.49, servings: 4 },
  },
  tempeh: {
    name: "Tempeh", role: "protein", aisle: "plant_protein",
    aliases: ["tempeh"],
    contains: ["soy"], storage: "fridge", shelfLife: { fridge: 10, freezer: 120, opened: { fridge: 5 } },
    serving: "1/3 pack", nutrition: n(160, 15, 8, 9), price: { package: "8 oz pack", cost: 3.49, servings: 3 },
  },
  paneer: {
    name: "Paneer", emoji: "🧀", role: "protein", aisle: "dairy_eggs",
    aliases: ["paneer"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 7, freezer: 90, opened: { fridge: 3 } },
    highRisk: true,
    storageTip: "Keep sealed and cold. Once opened, store airtight and use within 3 days, or freeze.",
    serving: "2 oz", nutrition: n(180, 11, 2, 14), price: { package: "14 oz block", cost: 5.99, servings: 7 },
  },
  edamame: {
    name: "Frozen edamame", emoji: "🫛", role: "legume", aisle: "frozen",
    aliases: ["edamame", "shelled edamame"],
    contains: ["soy"], storage: "freezer", shelfLife: { freezer: 240, fridge: 3 },
    serving: "1/2 cup", nutrition: n(120, 11, 9, 5), price: { package: "12 oz bag", cost: 2.99, servings: 3 },
  },
  chickpeas: {
    name: "Canned chickpeas", emoji: "🫘", role: "legume", aisle: "pantry",
    aliases: ["chickpeas", "garbanzo beans", "chana", "chole"],
    contains: [], storage: "pantry", shelfLife: { pantry: 730, opened: { fridge: 3 } },
    serving: "1/2 cup", nutrition: n(120, 6, 20, 2), price: { package: "15 oz can", cost: 1.29, servings: 3 },
  },
  black_beans: {
    name: "Canned black beans", emoji: "🫘", role: "legume", aisle: "pantry",
    aliases: ["black beans", "frijoles negros"],
    contains: [], storage: "pantry", shelfLife: { pantry: 730, opened: { fridge: 3 } },
    serving: "1/2 cup", nutrition: n(110, 7, 20, 0), price: { package: "15 oz can", cost: 1.19, servings: 3 },
  },
  kidney_beans: {
    name: "Canned kidney beans", emoji: "🫘", role: "legume", aisle: "pantry",
    aliases: ["kidney beans", "rajma", "red beans"],
    contains: [], storage: "pantry", shelfLife: { pantry: 730, opened: { fridge: 3 } },
    serving: "1/2 cup", nutrition: n(110, 7, 19, 0), price: { package: "15 oz can", cost: 1.19, servings: 3 },
  },
  red_lentils: {
    name: "Red lentils (masoor dal)", emoji: "🫘", role: "legume", aisle: "pantry",
    aliases: ["red lentils", "masoor dal", "lentils", "dal", "daal"],
    contains: [], storage: "pantry", shelfLife: { pantry: 365 },
    serving: "1/4 cup dry", nutrition: n(170, 12, 30, 1), price: { package: "2 lb bag", cost: 3.99, servings: 16 },
  },
  toor_dal: {
    name: "Toor dal", emoji: "🫘", role: "legume", aisle: "pantry",
    aliases: ["toor dal", "arhar dal", "yellow lentils", "pigeon peas"],
    contains: [], storage: "pantry", shelfLife: { pantry: 365 },
    serving: "1/4 cup dry", nutrition: n(170, 11, 30, 1), price: { package: "2 lb bag", cost: 4.49, servings: 16 },
  },
  hummus: {
    name: "Hummus", emoji: "🫘", role: "legume", aisle: "deli_ready",
    aliases: ["hummus", "houmous"],
    contains: ["sesame"], storage: "fridge", shelfLife: { fridge: 10, opened: { fridge: 5 } },
    serving: "1/4 cup", nutrition: n(140, 4, 8, 10), price: { package: "10 oz tub", cost: 3.99, servings: 5 },
  },

  // ------------------------------------------------------------- Dairy & alternatives
  greek_yogurt: {
    name: "Greek yogurt", emoji: "🥛", role: "dairy", aisle: "dairy_eggs",
    aliases: ["greek yogurt", "greek yoghurt"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 7, opened: { fridge: 5 } },
    highRisk: true,
    storageTip: "Keep cold and sealed; don't leave it out more than 2 hours. Use a clean spoon.",
    serving: "3/4 cup", nutrition: n(100, 17, 6, 0), price: { package: "32 oz tub", cost: 5.49, servings: 5 },
  },
  plain_yogurt: {
    name: "Plain yogurt (dahi)", emoji: "🥛", role: "dairy", aisle: "dairy_eggs",
    aliases: ["yogurt", "yoghurt", "dahi", "curd", "plain yogurt", "raita"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 7, opened: { fridge: 5 } },
    highRisk: true,
    storageTip: "Keep cold and sealed; don't leave it out more than 2 hours. Use a clean spoon.",
    serving: "3/4 cup", nutrition: n(110, 6, 9, 6), price: { package: "32 oz tub", cost: 3.99, servings: 5 },
  },
  soy_yogurt: {
    name: "Soy yogurt", emoji: "🥛", role: "dairy", aisle: "dairy_eggs",
    aliases: ["soy yogurt", "dairy free yogurt", "dairy-free yogurt", "vegan yogurt"],
    contains: ["soy"], storage: "fridge", shelfLife: { fridge: 14, opened: { fridge: 5 } },
    serving: "3/4 cup", nutrition: n(110, 6, 15, 3), price: { package: "24 oz tub", cost: 4.49, servings: 4 },
  },
  milk: {
    name: "Milk", emoji: "🥛", role: "dairy", aisle: "dairy_eggs",
    aliases: ["milk", "whole milk", "2% milk", "doodh"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 7, opened: { fridge: 5 } },
    highRisk: true,
    storageTip: "Back of the fridge, not the door. Don't leave it out; use within about a week.",
    serving: "1 cup", nutrition: n(150, 8, 12, 8), price: { package: "1 gallon", cost: 3.79, servings: 16 },
  },
  soy_milk: {
    name: "Soy milk", emoji: "🥛", role: "dairy", aisle: "dairy_eggs",
    aliases: ["soy milk", "soymilk"],
    contains: ["soy"], storage: "pantry", shelfLife: { pantry: 180, opened: { fridge: 7 } },
    serving: "1 cup", nutrition: n(100, 7, 8, 4), price: { package: "half gallon", cost: 3.49, servings: 8 },
  },
  oat_milk: {
    name: "Oat milk", emoji: "🥛", role: "dairy", aisle: "dairy_eggs",
    aliases: ["oat milk", "oatmilk"],
    contains: [], mayContain: ["wheat"], storage: "pantry", shelfLife: { pantry: 180, opened: { fridge: 7 } },
    serving: "1 cup", nutrition: n(120, 3, 16, 5), price: { package: "half gallon", cost: 4.49, servings: 8 },
  },
  cheddar: {
    name: "Cheddar cheese", emoji: "🧀", role: "dairy", aisle: "dairy_eggs",
    aliases: ["cheddar", "cheddar cheese", "cheese"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 180, freezer: 180, opened: { fridge: 21 } },
    highRisk: true,
    storageTip: "Rewrap tightly after opening. Small mold spot on hard cheese: cut 1 inch around it.",
    serving: "1 oz", nutrition: n(115, 7, 0, 9), price: { package: "8 oz block", cost: 3.99, servings: 8 },
  },
  mozzarella: {
    name: "Shredded mozzarella", emoji: "🧀", role: "dairy", aisle: "dairy_eggs",
    aliases: ["mozzarella", "shredded mozzarella", "shredded cheese"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 7, freezer: 180, opened: { fridge: 5 } },
    highRisk: true,
    storageTip: "Soft cheese: keep sealed and cold, use within a week. Toss it if you see mold. Check the package date.",
    serving: "1 oz", nutrition: n(85, 6, 1, 6), price: { package: "8 oz bag", cost: 3.49, servings: 8 },
  },
  feta: {
    name: "Feta", emoji: "🧀", role: "dairy", aisle: "dairy_eggs",
    aliases: ["feta", "feta cheese"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 7, opened: { fridge: 5 } },
    highRisk: true,
    storageTip: "Keep it in its brine, sealed. Soft cheese: toss it if you see mold.",
    serving: "1 oz", nutrition: n(75, 4, 1, 6), price: { package: "6 oz tub", cost: 4.49, servings: 6 },
  },
  cottage_cheese: {
    name: "Cottage cheese", emoji: "🧀", role: "dairy", aisle: "dairy_eggs",
    aliases: ["cottage cheese"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 7, opened: { fridge: 5 } },
    highRisk: true,
    storageTip: "Keep cold and sealed. Soft cheese: toss it if it smells sour or shows mold.",
    serving: "1/2 cup", nutrition: n(110, 12, 5, 5), price: { package: "16 oz tub", cost: 3.49, servings: 4 },
  },
  string_cheese: {
    name: "String cheese", emoji: "🧀", role: "snack", aisle: "dairy_eggs",
    aliases: ["string cheese", "cheese stick", "cheese sticks"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 7 },
    highRisk: true,
    storageTip: "Keep in the fridge until you eat it. Check the package date.",
    serving: "1 stick", nutrition: n(80, 7, 1, 6), price: { package: "12 sticks", cost: 4.99, servings: 12 },
  },
  butter: {
    name: "Butter", emoji: "🧈", role: "fat_oil", aisle: "dairy_eggs",
    aliases: ["butter"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 30, freezer: 180 },
    highRisk: true,
    storageTip: "Keep it covered in the fridge. Freeze extra sticks for months.",
    serving: "1 tbsp", nutrition: n(100, 0, 0, 11), price: { package: "1 lb", cost: 4.99, servings: 32 },
  },
  ghee: {
    name: "Ghee", emoji: "🧈", role: "fat_oil", aisle: "sauces_spices",
    aliases: ["ghee", "clarified butter"],
    contains: ["dairy"], storage: "pantry", shelfLife: { pantry: 90, opened: { pantry: 60 } },
    serving: "1 tbsp", nutrition: n(120, 0, 0, 14), price: { package: "13 oz jar", cost: 8.99, servings: 26 },
  },

  // ------------------------------------------------------------- Grains & bakery
  white_rice: {
    name: "White rice", emoji: "🍚", role: "grain", aisle: "pantry",
    aliases: ["rice", "white rice", "basmati", "basmati rice", "jasmine rice", "chawal"],
    contains: [], storage: "pantry", shelfLife: { pantry: 730 },
    serving: "1/4 cup dry", nutrition: n(170, 3, 37, 0), price: { package: "2 lb bag", cost: 2.99, servings: 20 },
  },
  brown_rice: {
    name: "Brown rice", emoji: "🍚", role: "grain", aisle: "pantry",
    aliases: ["brown rice"],
    contains: [], storage: "pantry", shelfLife: { pantry: 180 },
    serving: "1/4 cup dry", nutrition: n(170, 4, 35, 2), price: { package: "2 lb bag", cost: 2.99, servings: 20 },
  },
  microwave_rice: {
    name: "Microwave rice cups", emoji: "🍚", role: "grain", aisle: "pantry",
    aliases: ["microwave rice", "rice cup", "instant rice", "cooked rice bowl"],
    contains: [], storage: "pantry", shelfLife: { pantry: 270 },
    serving: "1 cup", nutrition: n(300, 5, 66, 0), price: { package: "6-pack", cost: 7.99, servings: 6 },
  },
  whole_wheat_bread: {
    name: "Whole wheat bread", emoji: "🍞", role: "grain", aisle: "bakery",
    aliases: ["bread", "toast", "whole wheat bread", "wheat bread", "sandwich bread"],
    contains: ["wheat"], mayContain: ["sesame", "soy", "egg", "dairy"], storage: "pantry",
    shelfLife: { pantry: 5, fridge: 10, freezer: 90 },
    serving: "2 slices", nutrition: n(200, 8, 36, 3), price: { package: "loaf", cost: 3.49, servings: 10 },
  },
  flour_tortilla: {
    name: "Flour tortillas", emoji: "🫓", role: "grain", aisle: "bakery",
    aliases: ["flour tortilla", "flour tortillas", "wrap", "wraps", "tortilla wrap"],
    contains: ["wheat"], mayContain: ["soy"], storage: "pantry",
    shelfLife: { pantry: 7, fridge: 21, freezer: 180 },
    serving: "2 tortillas", nutrition: n(280, 8, 48, 7), price: { package: "10-pack", cost: 2.99, servings: 5 },
  },
  corn_tortilla: {
    name: "Corn tortillas", emoji: "🫓", role: "grain", aisle: "bakery",
    aliases: ["corn tortilla", "corn tortillas"],
    contains: [], storage: "fridge", shelfLife: { pantry: 5, fridge: 14, freezer: 180 },
    serving: "3 tortillas", nutrition: n(150, 4, 30, 2), price: { package: "30-pack", cost: 2.49, servings: 10 },
  },
  pita: {
    name: "Pita bread", emoji: "🫓", role: "grain", aisle: "bakery",
    aliases: ["pita", "pita bread"],
    contains: ["wheat"], mayContain: ["sesame"], storage: "pantry", shelfLife: { pantry: 5, freezer: 90 },
    serving: "1 pita", nutrition: n(170, 6, 34, 1), price: { package: "6-pack", cost: 2.99, servings: 6 },
  },
  naan: {
    name: "Naan", emoji: "🫓", role: "grain", aisle: "bakery",
    aliases: ["naan", "nan bread"],
    contains: ["wheat", "dairy"], mayContain: ["egg", "sesame"], storage: "pantry",
    shelfLife: { pantry: 5, freezer: 90 },
    serving: "1 piece", nutrition: n(260, 8, 45, 5), price: { package: "4-pack", cost: 4.49, servings: 4 },
  },
  frozen_roti: {
    name: "Frozen roti", emoji: "🫓", role: "grain", aisle: "frozen",
    aliases: ["roti", "chapati", "phulka"],
    contains: ["wheat"], storage: "freezer", shelfLife: { freezer: 180, fridge: 3 },
    serving: "2 roti", nutrition: n(240, 6, 40, 6), price: { package: "15-pack", cost: 4.99, servings: 7 },
  },
  frozen_paratha: {
    name: "Frozen paratha", emoji: "🫓", role: "grain", aisle: "frozen",
    aliases: ["paratha", "parotta"],
    contains: ["wheat", "dairy"], storage: "freezer", shelfLife: { freezer: 180, fridge: 3 },
    serving: "1 paratha", nutrition: n(200, 4, 25, 10), price: { package: "5-pack", cost: 4.99, servings: 5 },
  },
  bagel: {
    name: "Bagels", emoji: "🥯", role: "grain", aisle: "bakery",
    aliases: ["bagel", "bagels"],
    contains: ["wheat"], mayContain: ["sesame", "egg"], storage: "pantry", shelfLife: { pantry: 5, freezer: 90 },
    serving: "1 bagel", nutrition: n(270, 10, 53, 2), price: { package: "6-pack", cost: 3.99, servings: 6 },
  },
  pasta: {
    name: "Pasta", emoji: "🍝", role: "grain", aisle: "pantry",
    aliases: ["pasta", "spaghetti", "penne", "macaroni"],
    contains: ["wheat"], mayContain: ["egg"], storage: "pantry", shelfLife: { pantry: 730 },
    serving: "2 oz dry", nutrition: n(200, 7, 42, 1), price: { package: "1 lb box", cost: 1.49, servings: 8 },
  },
  instant_ramen: {
    name: "Instant ramen", emoji: "🍜", role: "ready_made", aisle: "pantry",
    aliases: ["ramen", "instant ramen", "instant noodles", "cup noodles", "shin ramyun", "maggi"],
    contains: ["wheat", "soy"], mayContain: ["egg", "fish", "shellfish", "sesame", "dairy"],
    storage: "pantry", shelfLife: { pantry: 240 },
    serving: "1 pack", nutrition: n(500, 10, 80, 16), price: { package: "4-pack", cost: 5.99, servings: 4 },
  },
  udon: {
    name: "Frozen udon", emoji: "🍜", role: "grain", aisle: "frozen",
    aliases: ["udon", "udon noodles"],
    contains: ["wheat"], storage: "freezer", shelfLife: { freezer: 180, fridge: 2 },
    serving: "1 block", nutrition: n(270, 7, 56, 1), price: { package: "5-pack", cost: 4.49, servings: 5 },
  },
  oats: {
    name: "Rolled oats", emoji: "🥣", role: "grain", aisle: "pantry",
    aliases: ["oats", "oatmeal", "rolled oats", "overnight oats", "porridge"],
    contains: [], mayContain: ["wheat"], storage: "pantry", shelfLife: { pantry: 365 },
    serving: "1/2 cup dry", nutrition: n(150, 5, 27, 3), price: { package: "18 oz canister", cost: 3.49, servings: 13 },
  },
  granola: {
    name: "Granola", emoji: "🥣", role: "grain", aisle: "pantry",
    aliases: ["granola"],
    // Granola is a classic hidden-allergen food: nuts, peanut, dairy, soy vary by brand.
    contains: [], mayContain: ["peanut", "tree_nut", "wheat", "soy", "dairy"],
    storage: "pantry", shelfLife: { pantry: 180, opened: { pantry: 60 } },
    serving: "1/2 cup", nutrition: n(230, 5, 35, 8), price: { package: "12 oz bag", cost: 4.99, servings: 6 },
  },
  quinoa: {
    name: "Quinoa", role: "grain", aisle: "pantry",
    aliases: ["quinoa"],
    contains: [], storage: "pantry", shelfLife: { pantry: 730 },
    serving: "1/4 cup dry", nutrition: n(170, 6, 30, 3), price: { package: "12 oz bag", cost: 4.49, servings: 8 },
  },
  couscous: {
    name: "Couscous", role: "grain", aisle: "pantry",
    aliases: ["couscous"],
    contains: ["wheat"], storage: "pantry", shelfLife: { pantry: 365 },
    serving: "1/4 cup dry", nutrition: n(160, 6, 33, 1), price: { package: "10 oz box", cost: 2.99, servings: 6 },
  },
  potato: {
    name: "Potatoes", emoji: "🥔", role: "veg", aisle: "produce",
    aliases: ["potato", "potatoes", "aloo"],
    contains: [], storage: "pantry", shelfLife: { pantry: 21 },
    serving: "1 medium", nutrition: n(160, 4, 37, 0), price: { package: "5 lb bag", cost: 3.99, servings: 10 },
  },
  sweet_potato: {
    name: "Sweet potatoes", emoji: "🍠", role: "veg", aisle: "produce",
    aliases: ["sweet potato", "sweet potatoes", "yam", "shakarkandi"],
    contains: [], storage: "pantry", shelfLife: { pantry: 21 },
    serving: "1 medium", nutrition: n(110, 2, 26, 0), price: { package: "2 lb", cost: 2.49, servings: 4 },
  },

  // ------------------------------------------------------------- Vegetables
  spinach: {
    name: "Spinach", emoji: "🥬", role: "leafy_veg", aisle: "produce",
    aliases: ["spinach", "palak", "baby spinach"],
    contains: [], storage: "fridge", shelfLife: { fridge: 5, freezer: 240 },
    serving: "2 cups raw", nutrition: n(15, 2, 2, 0), price: { package: "10 oz bag", cost: 3.49, servings: 5 },
  },
  bagged_salad: {
    name: "Bagged salad mix", emoji: "🥗", role: "leafy_veg", aisle: "produce",
    aliases: ["salad", "bagged salad", "salad mix", "mixed greens", "spring mix"],
    contains: [], storage: "fridge", shelfLife: { fridge: 4, opened: { fridge: 2 } },
    serving: "2 cups", nutrition: n(15, 1, 3, 0), price: { package: "5 oz bag", cost: 3.49, servings: 3 },
  },
  kale: {
    name: "Kale", emoji: "🥬", role: "leafy_veg", aisle: "produce",
    aliases: ["kale"],
    contains: [], storage: "fridge", shelfLife: { fridge: 5, freezer: 240 },
    serving: "2 cups raw", nutrition: n(35, 2, 6, 0), price: { package: "bunch", cost: 2.49, servings: 3 },
  },
  romaine: {
    name: "Romaine lettuce", emoji: "🥬", role: "leafy_veg", aisle: "produce",
    aliases: ["romaine", "lettuce", "romaine lettuce"],
    contains: [], storage: "fridge", shelfLife: { fridge: 7 },
    serving: "2 cups", nutrition: n(15, 1, 3, 0), price: { package: "3 hearts", cost: 3.99, servings: 6 },
  },
  broccoli: {
    name: "Broccoli", emoji: "🥦", role: "veg", aisle: "produce",
    aliases: ["broccoli"],
    contains: [], storage: "fridge", shelfLife: { fridge: 5, freezer: 240 },
    serving: "1 cup", nutrition: n(30, 3, 6, 0), price: { package: "1 crown", cost: 2.49, servings: 3 },
  },
  frozen_broccoli: {
    name: "Frozen broccoli", emoji: "🥦", role: "veg", aisle: "frozen",
    aliases: ["frozen broccoli"],
    contains: [], storage: "freezer", shelfLife: { freezer: 240, fridge: 3 },
    serving: "1 cup", nutrition: n(30, 3, 5, 0), price: { package: "12 oz bag", cost: 2.49, servings: 4 },
  },
  frozen_mixed_veg: {
    name: "Frozen mixed veggies", emoji: "🥕", role: "veg", aisle: "frozen",
    aliases: ["mixed veg", "mixed vegetables", "frozen veggies", "frozen vegetables", "stir fry vegetables"],
    contains: [], storage: "freezer", shelfLife: { freezer: 240, fridge: 3 },
    serving: "2/3 cup", nutrition: n(60, 2, 12, 0), price: { package: "12 oz bag", cost: 1.99, servings: 4 },
  },
  frozen_peas: {
    name: "Frozen peas", emoji: "🫛", role: "veg", aisle: "frozen",
    aliases: ["peas", "green peas", "matar", "frozen peas"],
    contains: [], storage: "freezer", shelfLife: { freezer: 240, fridge: 3 },
    serving: "2/3 cup", nutrition: n(70, 5, 12, 0), price: { package: "12 oz bag", cost: 1.99, servings: 4 },
  },
  bell_pepper: {
    name: "Bell pepper", emoji: "🫑", role: "veg", aisle: "produce",
    aliases: ["bell pepper", "bell peppers", "capsicum", "red pepper", "green pepper"],
    contains: [], storage: "fridge", shelfLife: { fridge: 7 },
    serving: "1/2 pepper", nutrition: n(15, 1, 4, 0), price: { package: "each", cost: 1.29, servings: 2 },
  },
  onion: {
    name: "Onions", emoji: "🧅", role: "veg", aisle: "produce",
    aliases: ["onion", "onions", "pyaaz", "red onion"],
    contains: [], storage: "pantry", shelfLife: { pantry: 30, opened: { fridge: 7 } },
    serving: "1/2 onion", nutrition: n(25, 1, 6, 0), price: { package: "3 lb bag", cost: 3.49, servings: 12 },
  },
  garlic: {
    name: "Garlic", emoji: "🧄", role: "veg", aisle: "produce",
    aliases: ["garlic", "lehsun"],
    contains: [], storage: "pantry", shelfLife: { pantry: 60 },
    serving: "3 cloves", nutrition: n(15, 1, 3, 0), price: { package: "1 head", cost: 0.79, servings: 3 },
  },
  ginger: {
    name: "Ginger", emoji: "🫚", role: "veg", aisle: "produce",
    aliases: ["ginger", "adrak"],
    contains: [], storage: "fridge", shelfLife: { fridge: 21, freezer: 180 },
    serving: "1 tbsp", nutrition: n(5, 0, 1, 0), price: { package: "small knob", cost: 0.99, servings: 8 },
  },
  tomato: {
    name: "Tomatoes", emoji: "🍅", role: "veg", aisle: "produce",
    aliases: ["tomato", "tomatoes", "tamatar"],
    contains: [], storage: "pantry", shelfLife: { pantry: 5, fridge: 7 },
    serving: "1 tomato", nutrition: n(25, 1, 5, 0), price: { package: "each", cost: 0.89, servings: 1 },
  },
  canned_tomatoes: {
    name: "Canned tomatoes", emoji: "🥫", role: "veg", aisle: "pantry",
    aliases: ["canned tomatoes", "diced tomatoes", "crushed tomatoes", "tomato puree"],
    contains: [], storage: "pantry", shelfLife: { pantry: 540, opened: { fridge: 5 } },
    serving: "1/2 can", nutrition: n(40, 2, 8, 0), price: { package: "14.5 oz can", cost: 1.49, servings: 2 },
  },
  cucumber: {
    name: "Cucumber", emoji: "🥒", role: "veg", aisle: "produce",
    aliases: ["cucumber", "kheera"],
    contains: [], storage: "fridge", shelfLife: { fridge: 7 },
    serving: "1/2 cucumber", nutrition: n(20, 1, 4, 0), price: { package: "each", cost: 0.99, servings: 2 },
  },
  baby_carrots: {
    name: "Baby carrots", emoji: "🥕", role: "veg", aisle: "produce",
    aliases: ["carrot", "carrots", "baby carrots", "gajar"],
    contains: [], storage: "fridge", shelfLife: { fridge: 14 },
    serving: "1 cup", nutrition: n(35, 1, 8, 0), price: { package: "1 lb bag", cost: 1.99, servings: 5 },
  },
  cauliflower: {
    name: "Cauliflower", role: "veg", aisle: "produce",
    aliases: ["cauliflower", "gobi"],
    contains: [], storage: "fridge", shelfLife: { fridge: 7, freezer: 240 },
    serving: "1 cup", nutrition: n(25, 2, 5, 0), price: { package: "1 head", cost: 3.49, servings: 5 },
  },
  zucchini: {
    name: "Zucchini", emoji: "🥒", role: "veg", aisle: "produce",
    aliases: ["zucchini", "courgette"],
    contains: [], storage: "fridge", shelfLife: { fridge: 5 },
    serving: "1 zucchini", nutrition: n(33, 2, 6, 0), price: { package: "each", cost: 0.99, servings: 1 },
  },
  mushrooms: {
    name: "Mushrooms", emoji: "🍄", role: "veg", aisle: "produce",
    aliases: ["mushroom", "mushrooms"],
    contains: [], storage: "fridge", shelfLife: { fridge: 5 },
    serving: "1 cup", nutrition: n(15, 2, 2, 0), price: { package: "8 oz pack", cost: 2.49, servings: 3 },
  },
  cabbage: {
    name: "Cabbage", emoji: "🥬", role: "veg", aisle: "produce",
    aliases: ["cabbage", "patta gobi", "coleslaw mix"],
    contains: [], storage: "fridge", shelfLife: { fridge: 14 },
    serving: "1 cup shredded", nutrition: n(20, 1, 5, 0), price: { package: "1 head", cost: 2.99, servings: 10 },
  },
  okra: {
    name: "Okra (bhindi)", role: "veg", aisle: "produce",
    aliases: ["okra", "bhindi", "ladyfinger"],
    contains: [], storage: "fridge", shelfLife: { fridge: 3, freezer: 240 },
    serving: "1 cup", nutrition: n(35, 2, 7, 0), price: { package: "1 lb", cost: 3.49, servings: 4 },
  },
  kimchi: {
    name: "Kimchi", role: "veg", aisle: "deli_ready",
    aliases: ["kimchi"],
    // Traditional kimchi is made with fish sauce and often salted shrimp.
    contains: ["fish"], mayContain: ["shellfish"], storage: "fridge",
    shelfLife: { fridge: 90, opened: { fridge: 30 } },
    serving: "1/2 cup", nutrition: n(15, 1, 2, 0), price: { package: "16 oz jar", cost: 5.99, servings: 6 },
  },
  avocado: {
    name: "Avocado", emoji: "🥑", role: "veg", aisle: "produce",
    aliases: ["avocado", "avocados", "guacamole", "guac"],
    contains: [], storage: "pantry", shelfLife: { pantry: 4, fridge: 5 },
    serving: "1/2 avocado", nutrition: n(120, 2, 6, 11), price: { package: "each", cost: 1.25, servings: 2 },
  },
  green_chili: {
    name: "Green chilies", emoji: "🌶️", role: "veg", aisle: "produce",
    aliases: ["green chili", "green chilies", "hari mirch", "jalapeno", "jalapeño", "serrano"],
    contains: [], storage: "fridge", shelfLife: { fridge: 7, freezer: 180 },
    serving: "1–2 chilies", nutrition: n(5, 0, 1, 0), price: { package: "small bag", cost: 0.99, servings: 10 },
  },
  cilantro: {
    name: "Cilantro", emoji: "🌿", role: "leafy_veg", aisle: "produce",
    aliases: ["cilantro", "coriander", "dhania"],
    contains: [], storage: "fridge", shelfLife: { fridge: 7 },
    serving: "2 tbsp", nutrition: n(1, 0, 0, 0), price: { package: "bunch", cost: 0.99, servings: 10 },
  },
  scallions: {
    name: "Scallions", emoji: "🧅", role: "veg", aisle: "produce",
    aliases: ["scallions", "green onions", "spring onions"],
    contains: [], storage: "fridge", shelfLife: { fridge: 7 },
    serving: "2 stalks", nutrition: n(10, 1, 2, 0), price: { package: "bunch", cost: 0.99, servings: 4 },
  },
  lime: {
    name: "Limes", emoji: "🍋‍🟩", role: "fruit", aisle: "produce",
    aliases: ["lime", "limes", "nimbu"],
    contains: [], storage: "fridge", shelfLife: { pantry: 7, fridge: 21 },
    serving: "1 lime", nutrition: n(20, 0, 7, 0), price: { package: "each", cost: 0.4, servings: 1 },
  },
  lemon: {
    name: "Lemons", emoji: "🍋", role: "fruit", aisle: "produce",
    aliases: ["lemon", "lemons"],
    contains: [], storage: "fridge", shelfLife: { pantry: 7, fridge: 21 },
    serving: "1 lemon", nutrition: n(17, 1, 5, 0), price: { package: "each", cost: 0.79, servings: 1 },
  },

  // ------------------------------------------------------------- Fruit
  banana: {
    name: "Bananas", emoji: "🍌", role: "fruit", aisle: "produce",
    aliases: ["banana", "bananas", "kela"],
    contains: [], storage: "pantry", shelfLife: { pantry: 5, freezer: 90 },
    serving: "1 banana", nutrition: n(105, 1, 27, 0), price: { package: "bunch of 6", cost: 1.79, servings: 6 },
  },
  apple: {
    name: "Apples", emoji: "🍎", role: "fruit", aisle: "produce",
    aliases: ["apple", "apples", "seb"],
    contains: [], storage: "fridge", shelfLife: { pantry: 7, fridge: 30 },
    serving: "1 apple", nutrition: n(95, 1, 25, 0), price: { package: "3 lb bag", cost: 4.99, servings: 7 },
  },
  berries: {
    name: "Strawberries", emoji: "🍓", role: "fruit", aisle: "produce",
    aliases: ["strawberries", "strawberry", "berries", "blueberries"],
    contains: [], storage: "fridge", shelfLife: { fridge: 3, freezer: 240 },
    serving: "1 cup", nutrition: n(50, 1, 12, 0), price: { package: "1 lb box", cost: 3.99, servings: 3 },
  },
  frozen_berries: {
    name: "Frozen berries", emoji: "🫐", role: "fruit", aisle: "frozen",
    aliases: ["frozen berries", "frozen fruit", "mixed berries"],
    contains: [], storage: "freezer", shelfLife: { freezer: 240, fridge: 2 },
    serving: "1 cup", nutrition: n(70, 1, 17, 0), price: { package: "16 oz bag", cost: 4.99, servings: 4 },
  },
  orange: {
    name: "Oranges", emoji: "🍊", role: "fruit", aisle: "produce",
    aliases: ["orange", "oranges", "clementine", "clementines", "mandarin", "cutie"],
    contains: [], storage: "fridge", shelfLife: { pantry: 7, fridge: 21 },
    serving: "1 orange", nutrition: n(60, 1, 15, 0), price: { package: "3 lb bag", cost: 4.99, servings: 8 },
  },
  grapes: {
    name: "Grapes", emoji: "🍇", role: "fruit", aisle: "produce",
    aliases: ["grapes"],
    contains: [], storage: "fridge", shelfLife: { fridge: 7 },
    serving: "1 cup", nutrition: n(100, 1, 27, 0), price: { package: "2 lb bag", cost: 4.99, servings: 6 },
  },
  mango: {
    name: "Mango", emoji: "🥭", role: "fruit", aisle: "produce",
    aliases: ["mango", "mangoes", "aam"],
    contains: [], storage: "pantry", shelfLife: { pantry: 5, fridge: 5, freezer: 240 },
    serving: "1 cup", nutrition: n(100, 1, 25, 1), price: { package: "each", cost: 1.29, servings: 2 },
  },

  // ------------------------------------------------------------- Snacks
  chips: {
    name: "Potato chips", emoji: "🥔", role: "snack", aisle: "snacks",
    aliases: ["chips", "potato chips", "crisps", "lays"],
    contains: [], mayContain: ["dairy", "wheat", "soy"], storage: "pantry",
    shelfLife: { pantry: 60, opened: { pantry: 14 } },
    serving: "1 oz", nutrition: n(160, 2, 15, 10), price: { package: "8 oz bag", cost: 4.29, servings: 8 },
  },
  tortilla_chips: {
    name: "Tortilla chips", emoji: "🌽", role: "snack", aisle: "snacks",
    aliases: ["tortilla chips", "corn chips", "nachos chips"],
    // Plain corn, oil, salt. Flavored ones (e.g. Doritos) are a different product: not aliased here.
    contains: [], storage: "pantry", shelfLife: { pantry: 60, opened: { pantry: 14 } },
    serving: "1 oz", nutrition: n(140, 2, 18, 7), price: { package: "11 oz bag", cost: 3.99, servings: 11 },
  },
  roasted_chickpeas: {
    name: "Roasted chickpeas", emoji: "🫘", role: "snack", aisle: "snacks",
    aliases: ["roasted chickpeas", "crunchy chickpeas", "chickpea snack"],
    contains: [], mayContain: ["peanut", "tree_nut"], storage: "pantry",
    shelfLife: { pantry: 180, opened: { pantry: 30 } },
    serving: "1 oz", nutrition: n(120, 6, 17, 3), price: { package: "5 oz bag", cost: 3.99, servings: 5 },
  },
  popcorn: {
    name: "Popcorn", emoji: "🍿", role: "snack", aisle: "snacks",
    aliases: ["popcorn", "skinny pop"],
    contains: [], mayContain: ["dairy"], storage: "pantry", shelfLife: { pantry: 90, opened: { pantry: 14 } },
    serving: "3 cups popped", nutrition: n(130, 2, 14, 8), price: { package: "6.7 oz bag", cost: 3.99, servings: 7 },
  },
  seaweed_snack: {
    name: "Seaweed snacks", role: "snack", aisle: "snacks",
    aliases: ["seaweed", "seaweed snack", "seaweed snacks", "gim", "nori snack"],
    contains: ["sesame"], storage: "pantry", shelfLife: { pantry: 180, opened: { pantry: 3 } },
    serving: "1 pack", nutrition: n(30, 1, 1, 2), price: { package: "10 packs", cost: 5.99, servings: 10 },
  },
  trail_mix: {
    name: "Trail mix", role: "snack", aisle: "snacks",
    aliases: ["trail mix", "nut mix", "mixed nuts"],
    contains: ["peanut", "tree_nut"], mayContain: ["chocolate", "dairy", "soy"], storage: "pantry",
    shelfLife: { pantry: 180 },
    serving: "1/4 cup", nutrition: n(170, 5, 15, 11), price: { package: "14 oz bag", cost: 5.99, servings: 11 },
  },
  peanut_butter: {
    name: "Peanut butter", emoji: "🥜", role: "legume", aisle: "pantry",
    aliases: ["peanut butter", "pb"],
    contains: ["peanut"], storage: "pantry", shelfLife: { pantry: 180, opened: { pantry: 90 } },
    serving: "2 tbsp", nutrition: n(190, 7, 7, 16), price: { package: "16 oz jar", cost: 3.49, servings: 14 },
  },
  almonds: {
    name: "Almonds", role: "snack", aisle: "snacks",
    aliases: ["almond", "almonds", "badam"],
    contains: ["tree_nut"], mayContain: ["peanut"], storage: "pantry", shelfLife: { pantry: 180 },
    serving: "1 oz", nutrition: n(165, 6, 6, 14), price: { package: "16 oz bag", cost: 6.99, servings: 16 },
  },
  pumpkin_seeds: {
    name: "Pumpkin seeds", emoji: "🎃", role: "snack", aisle: "snacks",
    aliases: ["pumpkin seeds", "pepitas"],
    contains: [], storage: "pantry", shelfLife: { pantry: 180 },
    serving: "1 oz", nutrition: n(160, 8, 4, 13), price: { package: "8 oz bag", cost: 4.99, servings: 8 },
  },
  makhana: {
    name: "Roasted makhana", role: "snack", aisle: "snacks",
    aliases: ["makhana", "fox nuts", "lotus seeds"],
    contains: [], storage: "pantry", shelfLife: { pantry: 180, opened: { pantry: 30 } },
    serving: "1 oz", nutrition: n(110, 3, 20, 2), price: { package: "4 oz bag", cost: 5.99, servings: 4 },
  },
  rice_cakes: {
    name: "Rice cakes", role: "snack", aisle: "snacks",
    aliases: ["rice cake", "rice cakes"],
    contains: [], storage: "pantry", shelfLife: { pantry: 180, opened: { pantry: 30 } },
    serving: "2 cakes", nutrition: n(70, 2, 15, 1), price: { package: "14 cakes", cost: 2.49, servings: 7 },
  },
  crackers: {
    name: "Whole grain crackers", emoji: "🍘", role: "snack", aisle: "snacks",
    aliases: ["crackers", "triscuits", "wheat thins"],
    contains: ["wheat"], mayContain: ["sesame", "dairy", "soy"], storage: "pantry",
    shelfLife: { pantry: 180, opened: { pantry: 30 } },
    serving: "6 crackers", nutrition: n(120, 3, 20, 5), price: { package: "9 oz box", cost: 3.99, servings: 9 },
  },
  protein_bar: {
    name: "Protein bar", role: "snack", aisle: "snacks",
    aliases: ["protein bar", "protein bars", "clif bar", "quest bar"],
    // Protein bars often hide allergens: whey, soy, nuts, chocolate.
    contains: ["dairy", "soy"], mayContain: ["peanut", "tree_nut", "egg", "wheat", "chocolate"],
    storage: "pantry", shelfLife: { pantry: 180 },
    serving: "1 bar", nutrition: n(200, 20, 22, 7), price: { package: "12-pack", cost: 19.99, servings: 12 },
  },
  dark_chocolate: {
    name: "Dark chocolate", emoji: "🍫", role: "snack", aisle: "snacks",
    aliases: ["chocolate", "dark chocolate", "chocolate bar"],
    contains: ["chocolate"], mayContain: ["dairy", "peanut", "tree_nut", "soy"], storage: "pantry",
    shelfLife: { pantry: 365 },
    serving: "1 oz", nutrition: n(170, 2, 13, 12), price: { package: "3.5 oz bar", cost: 3.49, servings: 3 },
  },
  chocolate_chip_cookies: {
    name: "Chocolate chip cookies", emoji: "🍪", role: "snack", aisle: "snacks",
    aliases: ["cookie", "cookies", "chocolate chip cookies", "chips ahoy"],
    contains: ["wheat", "egg", "dairy", "chocolate"], mayContain: ["peanut", "tree_nut", "soy"],
    storage: "pantry", shelfLife: { pantry: 60, opened: { pantry: 14 } },
    serving: "3 cookies", nutrition: n(160, 2, 22, 8), price: { package: "13 oz pack", cost: 4.29, servings: 10 },
  },
  nutella: {
    name: "Chocolate hazelnut spread", emoji: "🍫", role: "snack", aisle: "pantry",
    aliases: ["nutella", "chocolate spread", "hazelnut spread"],
    contains: ["chocolate", "tree_nut", "dairy"], mayContain: ["soy"], storage: "pantry",
    shelfLife: { pantry: 365, opened: { pantry: 60 } },
    serving: "2 tbsp", nutrition: n(200, 2, 22, 12), price: { package: "13 oz jar", cost: 4.49, servings: 10 },
  },

  // ------------------------------------------------------------- Ready-made & frozen meals
  frozen_pork_dumplings: {
    name: "Frozen pork dumplings (mandu)", emoji: "🥟", role: "ready_made", aisle: "frozen",
    aliases: ["dumplings", "pork dumplings", "mandu", "potstickers", "gyoza"],
    contains: ["wheat", "soy", "pork", "sesame"], mayContain: ["egg", "shellfish"],
    storage: "freezer", shelfLife: { freezer: 90 },
    highRisk: true,
    storageTip: "Keep frozen and cook straight from frozen until steaming hot all the way through.",
    serving: "6 dumplings", nutrition: n(290, 12, 33, 12), price: { package: "1.5 lb bag", cost: 7.99, servings: 4 },
  },
  frozen_veggie_dumplings: {
    name: "Frozen veggie dumplings", emoji: "🥟", role: "ready_made", aisle: "frozen",
    aliases: ["veggie dumplings", "vegetable dumplings", "veggie gyoza", "veggie potstickers"],
    contains: ["wheat", "soy", "sesame"], mayContain: ["egg", "dairy"],
    storage: "freezer", shelfLife: { freezer: 180 },
    serving: "6 dumplings", nutrition: n(250, 7, 38, 7), price: { package: "1.5 lb bag", cost: 7.99, servings: 4 },
  },
  frozen_burrito: {
    name: "Frozen bean & cheese burrito", emoji: "🌯", role: "ready_made", aisle: "frozen",
    aliases: ["frozen burrito", "bean burrito", "bean and cheese burrito"],
    contains: ["wheat", "dairy"], mayContain: ["soy"], storage: "freezer", shelfLife: { freezer: 180 },
    serving: "1 burrito", nutrition: n(300, 10, 45, 9), price: { package: "8-pack", cost: 8.99, servings: 8 },
  },
  frozen_pizza: {
    name: "Frozen pizza", emoji: "🍕", role: "ready_made", aisle: "frozen",
    aliases: ["pizza", "frozen pizza"],
    contains: ["wheat", "dairy"], mayContain: ["soy", "egg", "pork"], storage: "freezer",
    shelfLife: { freezer: 180 },
    serving: "1/3 pizza", nutrition: n(330, 14, 38, 14), price: { package: "1 pizza", cost: 5.99, servings: 3 },
  },
  frozen_kimbap: {
    name: "Frozen veggie kimbap", emoji: "🍙", role: "ready_made", aisle: "frozen",
    aliases: ["kimbap", "gimbap"],
    contains: ["soy", "wheat", "sesame"], mayContain: ["egg"], storage: "freezer",
    shelfLife: { freezer: 180 },
    serving: "1 roll", nutrition: n(400, 9, 72, 9), price: { package: "1 roll", cost: 3.99, servings: 1 },
  },
  ready_dal_pouch: {
    name: "Ready-to-eat dal pouch", emoji: "🍛", role: "ready_made", aisle: "pantry",
    aliases: ["tasty bite", "dal pouch", "madras lentils", "ready dal", "dal makhani"],
    contains: ["dairy"], mayContain: ["tree_nut"], storage: "pantry",
    shelfLife: { pantry: 540, opened: { fridge: 3 } },
    serving: "1 pouch", nutrition: n(280, 12, 36, 10), price: { package: "10 oz pouch", cost: 3.29, servings: 1 },
  },
  lentil_soup: {
    name: "Canned lentil soup", emoji: "🥣", role: "ready_made", aisle: "pantry",
    aliases: ["lentil soup"],
    contains: [], mayContain: ["wheat", "dairy", "soy"], storage: "pantry",
    shelfLife: { pantry: 730, opened: { fridge: 3 } },
    serving: "1 can", nutrition: n(300, 16, 48, 4), price: { package: "19 oz can", cost: 2.99, servings: 1 },
  },
  caesar_salad_kit: {
    name: "Caesar salad kit", emoji: "🥗", role: "ready_made", aisle: "produce",
    aliases: ["caesar salad", "caesar salad kit", "salad kit"],
    // Caesar dressing: egg yolk, parmesan, anchovy; croutons: wheat.
    contains: ["egg", "dairy", "fish", "wheat"], storage: "fridge",
    shelfLife: { fridge: 4, opened: { fridge: 2 } },
    highRisk: true,
    storageTip: "Dressing has egg and dairy: keep cold, and eat within a day or two of opening.",
    serving: "1/3 kit", nutrition: n(150, 3, 8, 12), price: { package: "10 oz kit", cost: 4.49, servings: 3 },
  },
  veggie_burger: {
    name: "Frozen veggie burger", emoji: "🍔", role: "ready_made", aisle: "frozen",
    aliases: ["veggie burger", "black bean burger", "veggie patty"],
    contains: ["soy", "wheat"], mayContain: ["egg", "dairy"], storage: "freezer", shelfLife: { freezer: 180 },
    serving: "1 patty", nutrition: n(150, 12, 12, 6), price: { package: "4 patties", cost: 5.49, servings: 4 },
  },
  frozen_falafel: {
    name: "Frozen falafel", emoji: "🧆", role: "ready_made", aisle: "frozen",
    aliases: ["falafel"],
    contains: [], mayContain: ["sesame", "wheat"], storage: "freezer", shelfLife: { freezer: 180 },
    serving: "4 pieces", nutrition: n(220, 7, 24, 11), price: { package: "12 pieces", cost: 4.99, servings: 3 },
  },

  // ------------------------------------------------------------- Sauces, condiments, spices, oils
  soy_sauce: {
    name: "Soy sauce", role: "sauce", aisle: "sauces_spices",
    aliases: ["soy sauce", "shoyu"],
    contains: ["soy", "wheat"], storage: "pantry", shelfLife: { pantry: 730, opened: { pantry: 365 } },
    serving: "1 tbsp", nutrition: n(10, 1, 1, 0), price: { package: "15 oz bottle", cost: 3.49, servings: 30 },
  },
  gochujang: {
    name: "Gochujang", emoji: "🌶️", role: "sauce", aisle: "sauces_spices",
    aliases: ["gochujang", "korean chili paste"],
    contains: ["soy", "wheat"], storage: "pantry", shelfLife: { pantry: 365, opened: { fridge: 180 } },
    serving: "1 tbsp", nutrition: n(30, 1, 7, 0), price: { package: "17 oz tub", cost: 5.99, servings: 25 },
  },
  sesame_oil: {
    name: "Sesame oil", role: "fat_oil", aisle: "sauces_spices",
    aliases: ["sesame oil", "toasted sesame oil"],
    contains: ["sesame"], storage: "pantry", shelfLife: { pantry: 365, opened: { pantry: 180 } },
    serving: "1 tsp", nutrition: n(40, 0, 0, 5), price: { package: "5 oz bottle", cost: 4.99, servings: 30 },
  },
  fish_sauce: {
    name: "Fish sauce", role: "sauce", aisle: "sauces_spices",
    aliases: ["fish sauce", "nam pla"],
    contains: ["fish"], storage: "pantry", shelfLife: { pantry: 730, opened: { pantry: 365 } },
    serving: "1 tbsp", nutrition: n(10, 2, 1, 0), price: { package: "7 oz bottle", cost: 3.99, servings: 14 },
  },
  oyster_sauce: {
    name: "Oyster sauce", role: "sauce", aisle: "sauces_spices",
    aliases: ["oyster sauce"],
    contains: ["shellfish", "soy", "wheat"], storage: "pantry", shelfLife: { pantry: 365, opened: { fridge: 180 } },
    serving: "1 tbsp", nutrition: n(10, 0, 2, 0), price: { package: "9 oz bottle", cost: 3.99, servings: 17 },
  },
  peanut_sauce: {
    name: "Peanut sauce", emoji: "🥜", role: "sauce", aisle: "sauces_spices",
    aliases: ["peanut sauce", "satay sauce"],
    contains: ["peanut", "soy", "wheat"], storage: "pantry", shelfLife: { pantry: 365, opened: { fridge: 30 } },
    serving: "2 tbsp", nutrition: n(90, 3, 8, 6), price: { package: "8 oz bottle", cost: 4.49, servings: 8 },
  },
  teriyaki_sauce: {
    name: "Teriyaki sauce", role: "sauce", aisle: "sauces_spices",
    aliases: ["teriyaki", "teriyaki sauce"],
    contains: ["soy", "wheat"], mayContain: ["sesame"], storage: "pantry",
    shelfLife: { pantry: 365, opened: { fridge: 90 } },
    serving: "1 tbsp", nutrition: n(15, 1, 3, 0), price: { package: "10 oz bottle", cost: 3.99, servings: 20 },
  },
  sriracha: {
    name: "Sriracha", emoji: "🌶️", role: "sauce", aisle: "sauces_spices",
    aliases: ["sriracha"],
    contains: [], storage: "pantry", shelfLife: { pantry: 365, opened: { pantry: 180 } },
    serving: "1 tsp", nutrition: n(5, 0, 1, 0), price: { package: "17 oz bottle", cost: 3.99, servings: 60 },
  },
  hot_sauce: {
    name: "Hot sauce", emoji: "🌶️", role: "sauce", aisle: "sauces_spices",
    aliases: ["hot sauce", "valentina", "cholula", "tabasco"],
    contains: [], storage: "pantry", shelfLife: { pantry: 730, opened: { pantry: 180 } },
    serving: "1 tsp", nutrition: n(0, 0, 0, 0), price: { package: "5 oz bottle", cost: 2.99, servings: 30 },
  },
  mayo: {
    name: "Mayonnaise", role: "sauce", aisle: "sauces_spices",
    aliases: ["mayo", "mayonnaise", "kewpie"],
    contains: ["egg"], storage: "pantry", shelfLife: { pantry: 90, opened: { fridge: 60 } },
    serving: "1 tbsp", nutrition: n(90, 0, 0, 10), price: { package: "15 oz jar", cost: 4.49, servings: 30 },
  },
  ketchup: {
    name: "Ketchup", emoji: "🍅", role: "sauce", aisle: "sauces_spices",
    aliases: ["ketchup"],
    contains: [], storage: "pantry", shelfLife: { pantry: 365, opened: { fridge: 180 } },
    serving: "1 tbsp", nutrition: n(20, 0, 5, 0), price: { package: "20 oz bottle", cost: 2.99, servings: 40 },
  },
  salsa: {
    name: "Salsa", emoji: "🍅", role: "sauce", aisle: "sauces_spices",
    aliases: ["salsa", "pico de gallo", "salsa verde"],
    contains: [], storage: "pantry", shelfLife: { pantry: 365, opened: { fridge: 14 } },
    serving: "2 tbsp", nutrition: n(10, 0, 2, 0), price: { package: "16 oz jar", cost: 3.49, servings: 15 },
  },
  pesto: {
    name: "Basil pesto", emoji: "🌿", role: "sauce", aisle: "sauces_spices",
    aliases: ["pesto", "basil pesto"],
    // Pine nuts (tree nut) and parmesan; some brands use cashews.
    contains: ["tree_nut", "dairy"], mayContain: ["peanut"], storage: "pantry",
    shelfLife: { pantry: 365, opened: { fridge: 7 } },
    serving: "2 tbsp", nutrition: n(150, 2, 2, 15), price: { package: "6.7 oz jar", cost: 4.99, servings: 6 },
  },
  marinara: {
    name: "Marinara sauce", emoji: "🥫", role: "sauce", aisle: "sauces_spices",
    aliases: ["marinara", "pasta sauce", "tomato sauce", "spaghetti sauce"],
    contains: [], mayContain: ["dairy"], storage: "pantry", shelfLife: { pantry: 365, opened: { fridge: 5 } },
    serving: "1/2 cup", nutrition: n(70, 2, 11, 2), price: { package: "24 oz jar", cost: 3.49, servings: 5 },
  },
  tahini: {
    name: "Tahini", role: "sauce", aisle: "sauces_spices",
    aliases: ["tahini", "sesame paste"],
    contains: ["sesame"], storage: "pantry", shelfLife: { pantry: 365, opened: { pantry: 90 } },
    serving: "1 tbsp", nutrition: n(90, 3, 3, 8), price: { package: "16 oz jar", cost: 6.99, servings: 30 },
  },
  tzatziki: {
    name: "Tzatziki", role: "sauce", aisle: "deli_ready",
    aliases: ["tzatziki"],
    contains: ["dairy"], storage: "fridge", shelfLife: { fridge: 7, opened: { fridge: 5 } },
    highRisk: true,
    storageTip: "Yogurt-based: keep cold, don't leave it out more than 2 hours.",
    serving: "2 tbsp", nutrition: n(30, 1, 2, 2), price: { package: "8 oz tub", cost: 3.99, servings: 8 },
  },
  thai_curry_paste: {
    name: "Thai red curry paste", role: "sauce", aisle: "sauces_spices",
    aliases: ["curry paste", "red curry paste", "thai curry paste"],
    // Most brands include shrimp paste and sometimes fish sauce.
    contains: ["shellfish"], mayContain: ["fish"], storage: "pantry",
    shelfLife: { pantry: 365, opened: { fridge: 30 } },
    serving: "1 tbsp", nutrition: n(20, 0, 3, 1), price: { package: "4 oz jar", cost: 3.49, servings: 8 },
  },
  tikka_masala_sauce: {
    name: "Tikka masala simmer sauce", emoji: "🍛", role: "sauce", aisle: "sauces_spices",
    aliases: ["tikka masala sauce", "simmer sauce", "butter chicken sauce"],
    // Cream-based; many brands thicken with cashews.
    contains: ["dairy"], mayContain: ["tree_nut"], storage: "pantry",
    shelfLife: { pantry: 365, opened: { fridge: 5 } },
    serving: "1/3 jar", nutrition: n(110, 2, 10, 7), price: { package: "15 oz jar", cost: 4.49, servings: 3 },
  },
  coconut_milk: {
    name: "Coconut milk (canned)", emoji: "🥥", role: "sauce", aisle: "pantry",
    aliases: ["coconut milk", "coconut cream"],
    contains: [], storage: "pantry", shelfLife: { pantry: 730, opened: { fridge: 4 } },
    serving: "1/3 can", nutrition: n(150, 1, 2, 15), price: { package: "13.5 oz can", cost: 2.49, servings: 3 },
  },
  ranch: {
    name: "Ranch dressing", role: "sauce", aisle: "sauces_spices",
    aliases: ["ranch", "ranch dressing"],
    contains: ["dairy", "egg"], storage: "pantry", shelfLife: { pantry: 270, opened: { fridge: 60 } },
    serving: "2 tbsp", nutrition: n(130, 1, 2, 13), price: { package: "16 oz bottle", cost: 3.99, servings: 8 },
  },
  italian_dressing: {
    name: "Italian dressing", role: "sauce", aisle: "sauces_spices",
    aliases: ["italian dressing", "vinaigrette", "salad dressing"],
    contains: [], mayContain: ["dairy"], storage: "pantry", shelfLife: { pantry: 270, opened: { fridge: 60 } },
    serving: "2 tbsp", nutrition: n(70, 0, 3, 6), price: { package: "16 oz bottle", cost: 3.49, servings: 8 },
  },
  olive_oil: {
    name: "Olive oil", emoji: "🫒", role: "fat_oil", aisle: "sauces_spices",
    aliases: ["olive oil", "evoo"],
    contains: [], storage: "pantry", shelfLife: { pantry: 540 },
    serving: "1 tbsp", nutrition: n(120, 0, 0, 14), price: { package: "500 ml bottle", cost: 8.99, servings: 33 },
  },
  vegetable_oil: {
    name: "Vegetable oil", role: "fat_oil", aisle: "sauces_spices",
    aliases: ["vegetable oil", "canola oil", "cooking oil", "oil"],
    contains: [], storage: "pantry", shelfLife: { pantry: 365 },
    serving: "1 tbsp", nutrition: n(120, 0, 0, 14), price: { package: "48 oz bottle", cost: 4.49, servings: 90 },
  },
  honey: {
    name: "Honey", emoji: "🍯", role: "sauce", aisle: "sauces_spices",
    aliases: ["honey"],
    contains: [], storage: "pantry", shelfLife: { pantry: 730 },
    serving: "1 tbsp", nutrition: n(60, 0, 17, 0), price: { package: "12 oz bottle", cost: 5.99, servings: 20 },
  },
  garam_masala: {
    name: "Garam masala", role: "spice", aisle: "sauces_spices",
    aliases: ["garam masala"],
    contains: [], storage: "pantry", shelfLife: { pantry: 365 },
    serving: "1 tsp", nutrition: n(5, 0, 1, 0), price: { package: "3 oz jar", cost: 4.99, servings: 50 },
  },
  cumin: {
    name: "Cumin", role: "spice", aisle: "sauces_spices",
    aliases: ["cumin", "jeera"],
    contains: [], storage: "pantry", shelfLife: { pantry: 365 },
    serving: "1 tsp", nutrition: n(8, 0, 1, 1), price: { package: "2 oz jar", cost: 3.99, servings: 50 },
  },
  taco_seasoning: {
    name: "Taco seasoning", role: "spice", aisle: "sauces_spices",
    aliases: ["taco seasoning"],
    contains: [], mayContain: ["wheat", "soy", "dairy"], storage: "pantry", shelfLife: { pantry: 365 },
    serving: "2 tsp", nutrition: n(20, 0, 4, 0), price: { package: "1 oz packet", cost: 1.29, servings: 4 },
  },
} satisfies Record<string, FoodDef>;

/** The full catalog typed with FoodDef, so optional fields (emoji, mayContain) are accessible. */
export const FOOD_LIST: ReadonlyArray<[id: keyof typeof FOODS, food: FoodDef]> = Object.entries(FOODS) as [
  keyof typeof FOODS,
  FoodDef,
][];

export function getFood(id: keyof typeof FOODS): FoodDef {
  return FOODS[id];
}
