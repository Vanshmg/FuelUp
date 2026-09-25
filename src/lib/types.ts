/**
 * FuelUp's data model.
 *
 * Every shape is defined once as a zod schema, and the TypeScript type is
 * inferred from it. That gives us one source of truth that works both at
 * compile time (types) and at runtime (validating localStorage and AI output).
 *
 * Rule of thumb: we store *facts* (what was bought, when, where) and let code
 * *derive* everything else (expiry dates, costs, nutrition totals). Derived
 * numbers are never stored, so they can never drift out of sync.
 */
import { z } from "zod";
import { FOODS } from "@/lib/data/foods";

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

/** A local calendar date, "YYYY-MM-DD". No times, so no timezone surprises. */
export const IsoDateSchema = z.iso.date();
export type IsoDate = z.infer<typeof IsoDateSchema>;

/** Things a user can avoid or limit: allergens plus animal-product groups. */
export const AVOID_TAGS = [
  "peanut",
  "tree_nut",
  "dairy",
  "egg",
  "soy",
  "wheat",
  "fish",
  "shellfish",
  "sesame",
  "chocolate",
  "poultry", // a GROUP: means chicken + turkey + duck (see data/tagGroups.ts)
  "chicken",
  "turkey",
  "duck",
  "beef",
  "pork",
  "lamb",
] as const;
export const AvoidTagSchema = z.enum(AVOID_TAGS);
export type AvoidTag = z.infer<typeof AvoidTagSchema>;

/** The job a food does in a meal. Cheaper swaps must stay within the same role. */
export const FoodRoleSchema = z.enum([
  "protein",
  "legume",
  "leafy_veg",
  "veg",
  "fruit",
  "grain",
  "dairy", // the "milk / yogurt / cheese" slot — soy yogurt fills it too
  "snack",
  "ready_made",
  "sauce",
  "fat_oil",
  "spice",
]);
export type FoodRole = z.infer<typeof FoodRoleSchema>;

/** Where a food lives in the store. Used to group the grocery list. */
export const AisleSchema = z.enum([
  "produce",
  "meat_seafood",
  "plant_protein",
  "dairy_eggs",
  "bakery",
  "pantry",
  "frozen",
  "deli_ready",
  "snacks",
  "sauces_spices",
]);
export type Aisle = z.infer<typeof AisleSchema>;

export const StorageLocationSchema = z.enum(["fridge", "pantry", "freezer"]);
export type StorageLocation = z.infer<typeof StorageLocationSchema>;

/** Estimated nutrition for one serving. Always shown to users as an estimate. */
export const NutritionSchema = z.object({
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});
export type Nutrition = z.infer<typeof NutritionSchema>;

/** A catalog id like "egg" or "chicken_thigh". Must exist in the catalog. */
export type FoodId = keyof typeof FOODS;
export function isFoodId(value: unknown): value is FoodId {
  return typeof value === "string" && Object.hasOwn(FOODS, value);
}
export const FoodIdSchema = z.custom<FoodId>(isFoodId, { message: "Not a catalog food id" });

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const EffortLevelSchema = z.enum(["zero_cook", "minimal_cook", "likes_cooking"]);
export type EffortLevel = z.infer<typeof EffortLevelSchema>;

export const CuisineSchema = z.enum([
  "american",
  "mexican",
  "chinese",
  "korean",
  "japanese",
  "thai",
  "vietnamese",
  "indian",
  "italian",
  "mediterranean",
  "middle_eastern",
]);
export type Cuisine = z.infer<typeof CuisineSchema>;

/** A diet expands into avoid tags in code (see data/diets.ts). */
export const DietSchema = z.enum(["none", "vegetarian", "vegan", "pescatarian"]);
export type Diet = z.infer<typeof DietSchema>;

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const WeekdaySchema = z.enum(WEEKDAYS);
export type Weekday = z.infer<typeof WeekdaySchema>;

export const DayTypeSchema = z.enum(["packed", "busy", "free", "out"]);
export type DayType = z.infer<typeof DayTypeSchema>;

/** e.g. { tag: "egg", maxPerWeek: 4 } — counted per meal, across the whole week. */
export const WeeklyLimitSchema = z.object({
  tag: AvoidTagSchema,
  maxPerWeek: z.int().min(0).max(21),
});
export type WeeklyLimit = z.infer<typeof WeeklyLimitSchema>;

export const NutritionGoalSchema = z.enum(["balanced", "more_protein", "more_veggies", "less_junk"]);
export type NutritionGoal = z.infer<typeof NutritionGoalSchema>;

export const ProfileSchema = z.object({
  name: z.string().max(40).optional(),
  // The 3 onboarding questions
  effort: EffortLevelSchema,
  cuisines: z.array(CuisineSchema).min(1),
  diet: DietSchema,
  avoidTags: z.array(AvoidTagSchema), // hard avoids: never suggested
  avoidFoods: z.array(FoodIdSchema), // hard avoids for single foods, e.g. mushrooms
  weeklyLimits: z.array(WeeklyLimitSchema),
  // Asked later, one at a time — sensible defaults until then
  weeklyBudget: z.number().positive(),
  shoppingDay: WeekdaySchema,
  dayTypes: z.record(WeekdaySchema, DayTypeSchema),
  nutritionGoal: NutritionGoalSchema,
  proteinTargetG: z.number().positive(),
  insightDepth: z.enum(["casual", "deep"]),
  /** Which "ask later" questions the user has already seen, e.g. "budget". */
  askedAbout: z.array(z.string()),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export const MealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealSlot = z.infer<typeof MealSlotSchema>;

/** One ingredient in one portion of a meal. */
export const MealItemSchema = z.object({
  foodId: FoodIdSchema,
  servings: z.number().positive().max(6),
  /** Set when the meal uses a specific item already at home ("use your chicken"). */
  pantryItemId: z.string().optional(),
});
export type MealItem = z.infer<typeof MealItemSchema>;

/**
 * A meal. Cost and nutrition are NOT stored: code computes them from the
 * catalog, so the AI never supplies a number the user sees as fact.
 */
export const MealSchema = z.object({
  id: z.string(),
  slot: MealSlotSchema,
  name: z.string().min(1).max(80),
  items: z.array(MealItemSchema).min(1), // describes ONE portion
  prepMinutes: z.int().min(0).max(240),
  effort: EffortLevelSchema,
  /** Portions cooked. 3 = "cook once, eat three times". */
  portions: z.int().min(1).max(6),
  /** Set when this meal is eating leftovers from an earlier batch meal. */
  leftoverOf: z.string().optional(),
  /** Search terms for the recipe link; code builds the YouTube/Google URL. */
  recipeQuery: z.string().max(100).optional(),
  isNew: z.boolean(),
});
export type Meal = z.infer<typeof MealSchema>;

export const DayPlanSchema = z.object({
  date: IsoDateSchema,
  dayType: DayTypeSchema,
  meals: z.array(MealSchema),
});
export type DayPlan = z.infer<typeof DayPlanSchema>;

/** A meal slot left empty because nothing safe could be found. The UI offers "tap to regenerate". */
export const PlanGapSchema = z.object({
  date: IsoDateSchema,
  slot: MealSlotSchema,
  mealName: z.string(),
  reasons: z.array(z.string()),
});
export type PlanGap = z.infer<typeof PlanGapSchema>;

export const WeekPlanSchema = z.object({
  id: z.string(),
  startDate: IsoDateSchema,
  createdAt: z.string(),
  source: z.enum(["ai", "fallback", "demo"]),
  days: z.array(DayPlanSchema).min(1).max(7),
  /** Optional (added in Phase 5), so plans saved before it still load. */
  gaps: z.array(PlanGapSchema).optional(),
});
export type WeekPlan = z.infer<typeof WeekPlanSchema>;

// ---------------------------------------------------------------------------
// Groceries and pantry
// ---------------------------------------------------------------------------

/** A line on the shopping list. `price` is an estimate the user can edit. */
export const GroceryListItemSchema = z.object({
  foodId: FoodIdSchema,
  packages: z.int().min(1),
  price: z.number().nonnegative(),
  priceEdited: z.boolean(),
  bought: z.boolean(),
});
export type GroceryListItem = z.infer<typeof GroceryListItemSchema>;

/**
 * Something the user has at home. Expiry is computed by code from the
 * shelf-life table; only a user override (e.g. from the label) is stored.
 */
const PantryBase = {
  id: z.string(),
  storage: StorageLocationSchema,
  expiresOnOverride: IsoDateSchema.optional(),
};

export const PantryItemSchema = z.discriminatedUnion("kind", [
  z.object({
    ...PantryBase,
    kind: z.literal("grocery"),
    foodId: FoodIdSchema,
    purchasedOn: IsoDateSchema,
    opened: z.boolean(),
    openedOn: IsoDateSchema.optional(),
    pricePaid: z.number().nonnegative().optional(),
  }),
  z.object({
    ...PantryBase,
    kind: z.literal("leftover"),
    mealName: z.string(),
    sourceMealId: z.string().optional(),
    /** Ingredients, so leftovers go through the same allergen check. */
    foodIds: z.array(FoodIdSchema).min(1),
    cookedOn: IsoDateSchema,
    portionsLeft: z.int().min(0),
  }),
]);
export type PantryItem = z.infer<typeof PantryItemSchema>;

// ---------------------------------------------------------------------------
// Logging and events
// ---------------------------------------------------------------------------

/** One thing the user ate. Catalog foods have a foodId; free text has an estimate. */
export const LoggedItemSchema = z.object({
  foodId: FoodIdSchema.optional(),
  label: z.string().min(1).max(80),
  servings: z.number().positive().max(10),
  /** Only for foods outside the catalog. Always labeled as an estimate. */
  estimate: NutritionSchema.optional(),
});
export type LoggedItem = z.infer<typeof LoggedItemSchema>;

/**
 * An explicit log. "Assumed" days are not stored: if a day has no log,
 * code treats the plan as eaten.
 */
export const LogEntrySchema = z.object({
  id: z.string(),
  date: IsoDateSchema,
  slot: MealSlotSchema,
  items: z.array(LoggedItemSchema).min(1),
  source: z.enum(["as_planned", "recap", "quick_log", "voice"]),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

/** Behavior the app learns from. Code summarizes recent events into AI prompts. */
export const EventSchema = z.object({
  id: z.string(),
  type: z.enum(["accept", "reject", "swap", "skip", "purchase", "log", "regenerate"]),
  date: IsoDateSchema,
  foodId: FoodIdSchema.optional(),
  mealName: z.string().optional(),
  dayType: DayTypeSchema.optional(),
});
export type AppEvent = z.infer<typeof EventSchema>;

// ---------------------------------------------------------------------------
// Everything the app stores
// ---------------------------------------------------------------------------

/**
 * Bump only for BREAKING shape changes, and add a migration step in
 * storage/migrations.ts. New optional fields or profile fields with a default
 * in PROFILE_DEFAULTS don't need a bump. Never silently wipe a saved profile.
 */
export const STATE_VERSION = 1;

export const AppStateSchema = z.object({
  version: z.literal(STATE_VERSION),
  personaId: z.string().nullable(),
  profile: ProfileSchema.nullable(),
  plan: WeekPlanSchema.nullable(),
  groceryList: z.array(GroceryListItemSchema),
  pantry: z.array(PantryItemSchema),
  logs: z.array(LogEntrySchema),
  events: z.array(EventSchema),
});
export type AppState = z.infer<typeof AppStateSchema>;

export function emptyState(): AppState {
  return {
    version: STATE_VERSION,
    personaId: null,
    profile: null,
    plan: null,
    groceryList: [],
    pantry: [],
    logs: [],
    events: [],
  };
}
