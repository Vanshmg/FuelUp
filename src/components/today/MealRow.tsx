import { FoodIcon } from "@/components/ui/FoodIcon";
import { getFood } from "@/lib/data/foods";
import { formatUsd, mealCost } from "@/lib/safety/budget";
import { mealNutrition } from "@/lib/nutrition";
import type { SafetyIssue } from "@/lib/safety/issues";
import type { Meal } from "@/lib/types";

const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" } as const;
const NOT_THE_STAR = new Set(["sauce", "fat_oil", "spice"]);

/** The ingredient that best represents the meal visually (not the soy sauce). */
function heroFood(meal: Meal) {
  return (meal.items.find((item) => !NOT_THE_STAR.has(getFood(item.foodId).role)) ?? meal.items[0]).foodId;
}

export function MealRow({ meal, warnings = [] }: { meal: Meal; warnings?: SafetyIssue[] }) {
  const nutrition = mealNutrition(meal);
  return (
    <li className="flex gap-3 py-3">
      <FoodIcon foodId={heroFood(meal)} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">
          {SLOT_LABELS[meal.slot]}
          {meal.leftoverOf && <span className="ml-2 rounded-full bg-basil-soft px-2 py-0.5 text-basil normal-case">leftovers</span>}
          {meal.portions > 1 && <span className="ml-2 rounded-full bg-basil-soft px-2 py-0.5 text-basil normal-case">makes {meal.portions}</span>}
          {meal.isNew && <span className="ml-2 rounded-full bg-orange-soft px-2 py-0.5 text-orange-deep normal-case">new for you</span>}
        </p>
        <p className="font-display text-lg leading-snug font-extrabold">{meal.name}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-soft">
          <span>⏱ {meal.prepMinutes} min</span>
          <span>{formatUsd(mealCost(meal))}</span>
          <span>~{nutrition.kcal} kcal</span>
          <span className="font-semibold text-orange-deep">{nutrition.protein}g protein</span>
        </p>
        {warnings.map((warning) => (
          <p key={warning.code + warning.foodId} className="mt-1.5 rounded-lg bg-mustard-soft px-2.5 py-1.5 text-xs text-ink">
            ⚠️ {warning.message.replace(/^[A-Z][a-z]{2} \w+: /, "")}
          </p>
        ))}
      </div>
    </li>
  );
}

export { SLOT_LABELS };
