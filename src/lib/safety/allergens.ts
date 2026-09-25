/**
 * Allergen and restriction checks.
 *
 * Two layers of defense:
 * 1. Catalog tags on every ingredient (`contains` and `mayContain`).
 * 2. A text scan of the meal name and recipe query, using the synonym map,
 *    which catches "French toast" even if the ingredients left out egg.
 *
 * For HARD AVOIDS, "may contain" counts as a fail: safety first.
 */
import { ALLERGEN_SYNONYMS, SAFE_PHRASES } from "@/lib/data/allergenSynonyms";
import { DIET_AVOIDS } from "@/lib/data/diets";
import { getFood } from "@/lib/data/foods";
import { expandTags } from "@/lib/data/tagGroups";
import { AVOID_TAGS, type AvoidTag, type FoodId, type IsoDate, type Meal, type Profile } from "@/lib/types";
import { shortDayName } from "@/lib/dates";
import { makeIssue, TAG_LABELS, type SafetyIssue } from "./issues";

/**
 * Hard avoids from the profile plus everything the diet implies, with group
 * tags expanded ("poultry" → chicken, turkey, duck).
 */
export function effectiveAvoidTags(profile: Pick<Profile, "avoidTags" | "diet">): AvoidTag[] {
  return expandTags([...profile.avoidTags, ...DIET_AVOIDS[profile.diet]]);
}

// ---------------------------------------------------------------------------
// Text scan
// ---------------------------------------------------------------------------

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * One regex per tag. Matches whole words only: "egg" matches "egg salad"
 * but not "eggplant". Also allows a trailing "s" / "es" for plurals.
 */
const TAG_PATTERNS = Object.fromEntries(
  AVOID_TAGS.map((tag) => {
    const words = ALLERGEN_SYNONYMS[tag].map(escapeRegex).join("|");
    // A group tag has no words of its own; this pattern never matches.
    if (!words) return [tag, /(?!)/];
    return [tag, new RegExp(`(?<![a-z0-9])(?:${words})(?:e?s)?(?![a-z0-9])`, "i")];
  }),
) as Record<AvoidTag, RegExp>;

/**
 * Remove phrases that mention a trigger word without containing it:
 * the curated safe phrases ("peanut butter" for dairy) plus "<word>-free".
 */
function stripSafePhrases(text: string, tag: AvoidTag): string {
  let cleaned = text;
  for (const phrase of SAFE_PHRASES[tag] ?? []) cleaned = cleaned.split(phrase).join(" ");
  for (const word of ALLERGEN_SYNONYMS[tag]) {
    cleaned = cleaned.replace(new RegExp(`${escapeRegex(word)}[- ]free`, "g"), " ");
  }
  return cleaned;
}

/** Which of `tags` does this text mention? Group tags are checked via their members. */
export function tagsInText(text: string, tags: readonly AvoidTag[] = AVOID_TAGS): AvoidTag[] {
  const lower = text.toLowerCase();
  return expandTags(tags).filter((tag) => TAG_PATTERNS[tag].test(stripSafePhrases(lower, tag)));
}

// ---------------------------------------------------------------------------
// Food and meal checks
// ---------------------------------------------------------------------------

export interface FoodConflict {
  tag: AvoidTag;
  kind: "contains" | "may_contain";
}

/** Why a single catalog food is unsafe for these avoid tags (empty = fine). */
export function foodConflicts(foodId: FoodId, rawAvoidTags: readonly AvoidTag[]): FoodConflict[] {
  const food = getFood(foodId);
  const avoidTags = expandTags(rawAvoidTags);
  const conflicts: FoodConflict[] = [];
  for (const tag of food.contains) if (avoidTags.includes(tag)) conflicts.push({ tag, kind: "contains" });
  for (const tag of food.mayContain ?? []) {
    if (avoidTags.includes(tag)) conflicts.push({ tag, kind: "may_contain" });
  }
  return conflicts;
}

/** True if a food can be suggested to someone with these avoids. */
export function isFoodAllowed(foodId: FoodId, avoidTags: readonly AvoidTag[], avoidFoods: readonly FoodId[]): boolean {
  return !avoidFoods.includes(foodId) && foodConflicts(foodId, avoidTags).length === 0;
}

export interface MealPlace {
  date?: IsoDate;
  slot?: Meal["slot"];
}

/** "Tue lunch" / "Lunch" — where a problem is, in friendly words. */
export function describePlace({ date, slot }: MealPlace): string {
  const slotText = slot ?? "meal";
  return date ? `${shortDayName(date)} ${slotText}` : slotText.charAt(0).toUpperCase() + slotText.slice(1);
}

export function checkMealAllergens(
  meal: Pick<Meal, "id" | "name" | "items" | "recipeQuery" | "slot">,
  avoidTags: readonly AvoidTag[],
  avoidFoods: readonly FoodId[],
  date?: IsoDate,
): SafetyIssue[] {
  const where = describePlace({ date, slot: meal.slot });
  const base = { mealId: meal.id, date, slot: meal.slot };
  const issues: SafetyIssue[] = [];
  const reportedTags = new Set<AvoidTag>();

  for (const { foodId } of meal.items) {
    const food = getFood(foodId);
    if (avoidFoods.includes(foodId)) {
      issues.push(makeIssue("avoid_food", `${where}: "${meal.name}" uses ${food.name}, which you avoid.`, { ...base, foodId }));
    }
    for (const { tag, kind } of foodConflicts(foodId, avoidTags)) {
      reportedTags.add(tag);
      issues.push(
        kind === "contains"
          ? makeIssue("hard_avoid", `${where}: "${meal.name}" uses ${food.name}, which contains ${TAG_LABELS[tag]}.`, {
              ...base,
              foodId,
              tag,
            })
          : makeIssue(
              "may_contain",
              `${where}: "${meal.name}" uses ${food.name}, which may contain ${TAG_LABELS[tag]} depending on the brand.`,
              { ...base, foodId, tag },
            ),
      );
    }
  }

  const text = [meal.name, meal.recipeQuery ?? ""].join(" ");
  for (const tag of tagsInText(text, avoidTags)) {
    if (reportedTags.has(tag)) continue;
    issues.push(
      makeIssue("name_mentions", `${where}: "${meal.name}" sounds like it contains ${TAG_LABELS[tag]}.`, { ...base, tag }),
    );
  }
  return issues;
}
