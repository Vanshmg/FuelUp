import { describe, expect, it } from "vitest";
import { PERSONAS, getPersona } from "@/lib/data/personas";
import { DIET_AVOIDS } from "@/lib/data/diets";
import { getFood } from "@/lib/data/foods";
import { addDays } from "@/lib/dates";
import { AppStateSchema, STATE_VERSION, type AvoidTag, type FoodId } from "@/lib/types";

const TODAY = "2026-09-25";

/** Simple tag check. The full safety check (with synonyms) arrives in Phase 3. */
function hardAvoidHits(foodId: FoodId, avoid: AvoidTag[]): AvoidTag[] {
  const food = getFood(foodId);
  return [...food.contains, ...(food.mayContain ?? [])].filter((tag) => avoid.includes(tag));
}

describe("demo personas", () => {
  it("has one persona per user type", () => {
    expect(PERSONAS.map((p) => p.build(TODAY).profile?.effort)).toEqual([
      "zero_cook",
      "minimal_cook",
      "likes_cooking",
    ]);
  });

  for (const persona of PERSONAS) {
    describe(persona.name, () => {
      const state = persona.build(TODAY);
      const profile = state.profile!;
      const avoid = [...profile.avoidTags, ...DIET_AVOIDS[profile.diet]];

      it("is valid saved data", () => {
        expect(AppStateSchema.safeParse({ ...state, version: STATE_VERSION }).success).toBe(true);
      });

      it("has nothing in the pantry that breaks a hard avoid", () => {
        for (const item of state.pantry) {
          const ids = item.kind === "grocery" ? [item.foodId] : item.foodIds;
          for (const id of ids) expect(hardAvoidHits(id, avoid), `${persona.name}: ${id}`).toEqual([]);
        }
      });

      it("has no logged catalog food that breaks a hard avoid", () => {
        for (const entry of state.logs) {
          for (const logged of entry.items) {
            if (logged.foodId) expect(hardAvoidHits(logged.foodId, avoid), logged.label).toEqual([]);
          }
        }
      });

      it("has every logged item matched to the catalog or given an estimate", () => {
        for (const entry of state.logs) {
          for (const logged of entry.items) {
            expect(logged.foodId !== undefined || logged.estimate !== undefined, logged.label).toBe(true);
          }
        }
      });

      it("puts every log, purchase, opening, and cook date on or before today", () => {
        const dates = [
          ...state.logs.map((entry) => entry.date),
          ...state.events.map((event) => event.date),
          ...state.pantry.flatMap((item) =>
            item.kind === "grocery" ? [item.purchasedOn, ...(item.openedOn ? [item.openedOn] : [])] : [item.cookedOn],
          ),
        ];
        for (const date of dates) expect(date <= TODAY).toBe(true);
      });

      it("shifts every date when built on a different day", () => {
        const later = persona.build(addDays(TODAY, 30));
        const pantryDates = (s: typeof state) =>
          s.pantry.map((item) => (item.kind === "grocery" ? item.purchasedOn : item.cookedOn));
        expect(pantryDates(later)).toEqual(pantryDates(state).map((d) => addDays(d, 30)));
        expect(later.logs.map((l) => l.date)).toEqual(state.logs.map((l) => addDays(l.date, 30)));
      });
    });
  }

  it("Jae avoids peanuts, which blocks granola and trail mix", () => {
    const profile = getPersona("jae")!.build(TODAY).profile!;
    expect(hardAvoidHits("granola", profile.avoidTags)).toEqual(["peanut"]);
    expect(hardAvoidHits("trail_mix", profile.avoidTags)).toEqual(["peanut"]);
  });

  it("Arjun starts the week with 2 egg meals and 1 chocolate logged", () => {
    const { profile, logs } = getPersona("arjun")!.build(TODAY);
    expect(profile!.weeklyLimits).toEqual([
      { tag: "egg", maxPerWeek: 4 },
      { tag: "chocolate", maxPerWeek: 3 },
    ]);
    const mealsWith = (tag: AvoidTag) =>
      logs.filter((entry) =>
        entry.items.some((logged) => logged.foodId && getFood(logged.foodId).contains.includes(tag)),
      ).length;
    expect(mealsWith("egg")).toBe(2);
    expect(mealsWith("chocolate")).toBe(1);
  });

  it("Sofia is vegetarian and dairy-free, with deep insights on", () => {
    const profile = getPersona("sofia")!.build(TODAY).profile!;
    expect(profile.diet).toBe("vegetarian");
    expect(profile.avoidTags).toContain("dairy");
    expect(profile.insightDepth).toBe("deep");
  });
});
