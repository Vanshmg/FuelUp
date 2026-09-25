/**
 * The shape we ask Gemini to return, in two forms:
 * 1. A JSON Schema sent WITH the request, so Gemini's output is structured.
 * 2. A zod schema that validates the reply BEFORE we use it.
 *
 * Ingredients are plain strings in both. We tried a JSON-Schema enum of all
 * allowed catalog ids, but Gemini rejects a schema with an enum that large
 * (HTTP 400). The allowed ids are listed in the prompt instead, and code
 * enforces them: an off-list ingredient is an "unknown ingredient" safety
 * issue that triggers the retry.
 */
import { z } from "zod";
import { EffortLevelSchema, MealSlotSchema } from "@/lib/types";

export const AiIngredientSchema = z.object({
  food: z.string().min(1),
  servings: z.number().min(0.25).max(6),
  pantryItemId: z.string().optional(),
});

export const AiMealSchema = z.object({
  id: z.string().min(1),
  slot: MealSlotSchema,
  name: z.string().min(1).max(80),
  ingredients: z.array(AiIngredientSchema),
  prepMinutes: z.number().min(0).max(240).transform(Math.round),
  effort: EffortLevelSchema,
  portions: z.number().int().min(1).max(6),
  leftoverOf: z.string().optional(),
  recipeQuery: z.string().max(100).optional(),
  isNew: z.boolean(),
});
export type AiMeal = z.infer<typeof AiMealSchema>;

export const AiPlanSchema = z.object({
  days: z.array(z.object({ date: z.string(), meals: z.array(AiMealSchema) })).min(1).max(7),
});
export type AiPlan = z.infer<typeof AiPlanSchema>;

function mealJsonSchema() {
  return {
    type: "object",
    properties: {
      id: { type: "string", description: "Short unique id, e.g. d2-dinner" },
      slot: { type: "string", enum: MealSlotSchema.options },
      name: { type: "string", description: "Appetizing, specific meal name, max 60 characters" },
      ingredients: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            food: { type: "string", description: "An id from ALLOWED FOODS, exactly as written" },
            servings: { type: "number", description: "Catalog servings in ONE portion, e.g. 1 or 0.5" },
            pantryItemId: { type: "string", description: "Only when using a specific item from the kitchen list" },
          },
          required: ["food", "servings"],
        },
      },
      prepMinutes: { type: "integer" },
      effort: { type: "string", enum: EffortLevelSchema.options },
      portions: { type: "integer", description: "Portions cooked. >1 only for batch cooking." },
      leftoverOf: { type: "string", description: "id of the batch meal (or kitchen leftover) this meal eats" },
      recipeQuery: { type: "string", description: "Search words for a recipe video" },
      isNew: { type: "boolean", description: "true for at most ONE meal: the week's new dish" },
    },
    required: ["id", "slot", "name", "ingredients", "prepMinutes", "effort", "portions", "isNew"],
  };
}

export function planJsonSchema(): object {
  return {
    type: "object",
    properties: {
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "YYYY-MM-DD, exactly as given" },
            meals: { type: "array", items: mealJsonSchema() },
          },
          required: ["date", "meals"],
        },
      },
    },
    required: ["days"],
  };
}

export function singleMealJsonSchema(): object {
  return mealJsonSchema();
}
