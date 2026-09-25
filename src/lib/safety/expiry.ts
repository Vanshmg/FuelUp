/**
 * Expiry math. All shelf-life data comes from the curated catalog table,
 * never from the AI. Everything here is an ESTIMATE: "Check the label, look,
 * and smell. When in doubt, throw it out."
 *
 * Counting rule: the start day is day 1. A food with a 2-day fridge life
 * bought on Monday is good through Tuesday. Leftovers (4 days) cooked on
 * Monday are good through Thursday.
 */
import { addDays, daysBetween, minDate } from "@/lib/dates";
import { getFood, type FoodDef } from "@/lib/data/foods";
import type { FoodId, IsoDate, PantryItem, StorageLocation } from "@/lib/types";

/** Cooked leftovers. Room temperature: 0 days (the 2-hour rule). */
export const LEFTOVER_SHELF_LIFE: Record<StorageLocation, number> = { fridge: 4, freezer: 60, pantry: 0 };

const COLDNESS: Record<StorageLocation, number> = { pantry: 0, fridge: 1, freezer: 2 };

/** The last day a food is good, given the day its clock started. 0 days = already gone. */
export function lastGoodDay(start: IsoDate, days: number): IsoDate {
  return addDays(start, days - 1);
}

/**
 * Days a catalog food keeps (unopened) in a storage location.
 * If the table has no value for that location:
 * - colder than usual (e.g. canned beans in the fridge): use the usual value,
 *   since colder never shortens safe life;
 * - warmer than usual (e.g. eggs or raw chicken left in the pantry): treat
 *   it as unsafe right away. Safety first.
 */
export function shelfLifeDays(food: FoodDef, storage: StorageLocation): number {
  const direct = food.shelfLife[storage];
  if (direct !== undefined) return direct;
  if (COLDNESS[storage] > COLDNESS[food.storage]) return food.shelfLife[food.storage] ?? 0;
  return 0;
}

/** Days a food keeps once opened, or undefined if opening doesn't matter. */
function openedShelfLifeDays(food: FoodDef, storage: StorageLocation): number | undefined {
  const opened = food.shelfLife.opened;
  if (!opened || storage === "freezer") return undefined; // freezing pauses the clock
  // Stored somewhere unusual after opening? Use the shortest opened value.
  return opened[storage] ?? Math.min(...Object.values(opened));
}

/** The estimated last good day for something at home. A user-entered date wins. */
export function expiresOn(item: PantryItem): IsoDate {
  if (item.expiresOnOverride) return item.expiresOnOverride;
  if (item.kind === "leftover") return lastGoodDay(item.cookedOn, LEFTOVER_SHELF_LIFE[item.storage]);

  const food = getFood(item.foodId);
  let useBy = lastGoodDay(item.purchasedOn, shelfLifeDays(food, item.storage));

  if (item.opened) {
    const openedDays = openedShelfLifeDays(food, item.storage);
    if (openedDays !== undefined) {
      useBy = minDate(useBy, lastGoodDay(item.openedOn ?? item.purchasedOn, openedDays));
    }
  }
  return useBy;
}

/** When a food bought on `purchasedOn` and stored the usual way goes bad. */
export function freshPurchaseUseBy(foodId: FoodId, purchasedOn: IsoDate): IsoDate {
  const food = getFood(foodId);
  return lastGoodDay(purchasedOn, shelfLifeDays(food, food.storage));
}

export type FreshnessState = "expired" | "last_day" | "soon" | "ok";

export interface Freshness {
  useBy: IsoDate;
  /** 0 = today is the last day; negative = past it. */
  daysLeft: number;
  state: FreshnessState;
}

/** "Soon" means within 2 days: time for a friendly heads-up. */
export function freshness(item: PantryItem, today: IsoDate): Freshness {
  const useBy = expiresOn(item);
  const daysLeft = daysBetween(today, useBy);
  const state: FreshnessState = daysLeft < 0 ? "expired" : daysLeft === 0 ? "last_day" : daysLeft <= 2 ? "soon" : "ok";
  return { useBy, daysLeft, state };
}

/** Can this item still be eaten on `date`? */
export function isGoodOn(item: PantryItem, date: IsoDate): boolean {
  return date <= expiresOn(item);
}

/** Pantry items still good today. Only these may ever be suggested. */
export function usablePantry(pantry: readonly PantryItem[], today: IsoDate): PantryItem[] {
  return pantry.filter((item) => isGoodOn(item, today));
}
