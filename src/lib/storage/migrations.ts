/**
 * Upgrading saved data when the data model changes.
 *
 * The rule: a change to the saved data shape must never silently wipe a
 * user's profile. Two ways to honor it:
 *
 * 1. Additive change (a new field with a sensible default): add the default to
 *    PROFILE_DEFAULTS. Old profiles pick it up automatically on load; no
 *    version bump needed.
 * 2. Breaking change (rename, restructure, remove): bump STATE_VERSION in
 *    types.ts and add a step here, MIGRATIONS[oldVersion], that converts the
 *    old shape to the new one. Add a test with a real old-shape sample.
 *
 * Safety fields (avoidTags, weeklyLimits, avoidFoods) must always be migrated,
 * never dropped: losing an allergy is worse than asking the user again.
 */
import { STATE_VERSION } from "@/lib/types";

export type SavedData = Record<string, unknown>;
export type Migration = (data: SavedData) => SavedData;

/** MIGRATIONS[n] upgrades saved data from version n to version n + 1. */
export const MIGRATIONS: Record<number, Migration> = {
  // Example for the future:
  // 1: (data) => ({ ...data, version: 2, profile: renameField(data.profile) }),
};

export type MigrationResult =
  | { ok: true; data: SavedData }
  | { ok: false; reason: "future_version" | "missing_step"; version: number };

export function migrate(
  data: SavedData,
  migrations: Record<number, Migration> = MIGRATIONS,
  target: number = STATE_VERSION,
): MigrationResult {
  // Data saved before versioning existed is treated as version 1.
  let version = typeof data.version === "number" ? data.version : 1;
  if (version > target) return { ok: false, reason: "future_version", version };

  let current = data;
  while (version < target) {
    const step = migrations[version];
    if (!step) return { ok: false, reason: "missing_step", version };
    current = step(current);
    version += 1;
  }
  return { ok: true, data: { ...current, version: target } };
}
