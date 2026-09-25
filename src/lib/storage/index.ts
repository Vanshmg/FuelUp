/**
 * The storage module: the ONLY way the app reads or writes saved data.
 *
 * How it works:
 * - The whole app state is one JSON object, validated with zod on load.
 * - A cached copy lives in memory; every change replaces it with a new object
 *   (never mutated), saves it, and notifies subscribers so React re-renders.
 * - Broken or outdated saved data never crashes the app, and never silently
 *   wipes the profile: old versions are migrated (see migrations.ts), and
 *   anything unreadable is backed up before it could be overwritten.
 */
import { z } from "zod";
import {
  AppStateSchema,
  emptyState,
  ProfileSchema,
  STATE_VERSION,
  type AppEvent,
  type AppState,
  type GroceryListItem,
  type LogEntry,
  type PantryItem,
  type Profile,
  type WeekPlan,
} from "@/lib/types";
import { PROFILE_DEFAULTS } from "@/lib/data/defaults";
import { localStorageAdapter, memoryAdapter, type StorageAdapter } from "./adapters";
import { migrate } from "./migrations";

/** Keep the event history bounded; insights only look at recent weeks. */
const MAX_EVENTS = 1000;

let adapter: StorageAdapter = typeof window === "undefined" ? memoryAdapter() : localStorageAdapter();
let cache: AppState | null = null;
let loadNotices: string[] = [];
const listeners = new Set<() => void>();

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/** Swap where data is stored (tests use memory; later, Supabase). */
export function setStorageAdapter(next: StorageAdapter): void {
  adapter = next;
  cache = null;
}

/** The current state. Returns the same object until something changes. */
export function getState(): AppState {
  if (!cache) {
    const raw = adapter.read();
    const result = parseSavedState(raw);
    if (result.keepBackup && raw) adapter.backup(raw);
    loadNotices = result.notices;
    cache = result.state;
  }
  return cache;
}

/** Notes from the last load (e.g. "we couldn't read your profile"). */
export function getLoadNotices(): string[] {
  getState();
  return loadNotices;
}

/** Subscribe to changes. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(change: (state: AppState) => AppState): void {
  cache = change(getState());
  adapter.write(JSON.stringify(cache));
  listeners.forEach((listener) => listener());
}

export interface LoadResult {
  state: AppState;
  /** Friendly notes about anything we couldn't read, for the UI to show once. */
  notices: string[];
  /** True when saved data couldn't be fully read: keep a copy before overwriting. */
  keepBackup: boolean;
}

/**
 * Turn saved JSON into a valid AppState, salvaging what we can.
 *
 * Order: migrate old versions → validate → if anything is still invalid,
 * keep every section that parses on its own. A profile is never silently
 * dropped: missing new fields get defaults, and if it still can't be read,
 * the raw data is backed up and the user is told.
 */
export function parseSavedState(raw: string | null): LoadResult {
  const fresh = (notices: string[] = [], keepBackup = false): LoadResult => ({
    state: emptyState(),
    notices,
    keepBackup,
  });
  if (!raw) return fresh();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return fresh(["We couldn't read your saved data, so FuelUp started fresh. A backup was kept."], true);
  }
  if (typeof parsedJson !== "object" || parsedJson === null || Array.isArray(parsedJson)) {
    return fresh(["We couldn't read your saved data, so FuelUp started fresh. A backup was kept."], true);
  }

  const migrated = migrate(parsedJson as Record<string, unknown>);
  if (!migrated.ok) {
    return fresh(
      ["Your saved data is from a different version of FuelUp, so we started fresh. A backup was kept."],
      true,
    );
  }
  const data = migrated.data;

  const full = AppStateSchema.safeParse(data);
  if (full.success) return { state: full.data, notices: [], keepBackup: false };

  // Something is invalid. Keep every section that still parses on its own.
  const salvaged = emptyState();
  const notices: string[] = [];
  const shape = AppStateSchema.shape;

  for (const key of Object.keys(shape) as (keyof AppState)[]) {
    if (key === "version" || key === "profile") continue;
    const schema = shape[key];
    const value = data[key];

    if (schema instanceof z.ZodArray && Array.isArray(value)) {
      // For lists, keep the good entries and drop only the broken ones.
      const good = value.flatMap((entry) => {
        const parsed = schema.element.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      });
      (salvaged as Record<string, unknown>)[key] = good;
      continue;
    }

    const section = schema.safeParse(value);
    if (section.success) (salvaged as Record<string, unknown>)[key] = section.data;
  }

  // The profile holds allergies, so it gets extra care.
  const profile = recoverProfile(data.profile);
  salvaged.profile = profile;
  const profileLost = data.profile != null && profile === null;
  if (profileLost) {
    notices.push(
      "We couldn't read your saved profile, so please set it up again (it takes a minute). Your old data was backed up.",
    );
  }
  return { state: salvaged, notices, keepBackup: profileLost };
}

/**
 * Read a saved profile, filling in defaults for any fields added since it was
 * saved. Returns null only if it still isn't valid — never drops an allergy
 * or limit just to make it fit.
 */
function recoverProfile(value: unknown): Profile | null {
  if (typeof value !== "object" || value === null) return null;
  const parsed = ProfileSchema.safeParse({ ...PROFILE_DEFAULTS, ...value });
  return parsed.success ? parsed.data : null;
}

/** Just the state. Convenient for tests. */
export function parseState(raw: string | null): AppState {
  return parseSavedState(raw).state;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const getProfile = (): Profile | null => getState().profile;

export function saveProfile(profile: Profile): void {
  update((s) => ({ ...s, profile }));
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export const getPlan = (): WeekPlan | null => getState().plan;

export function savePlan(plan: WeekPlan | null): void {
  update((s) => ({ ...s, plan }));
}

// ---------------------------------------------------------------------------
// Grocery list
// ---------------------------------------------------------------------------

export const getGroceryList = (): GroceryListItem[] => getState().groceryList;

export function saveGroceryList(groceryList: GroceryListItem[]): void {
  update((s) => ({ ...s, groceryList }));
}

// ---------------------------------------------------------------------------
// Pantry
// ---------------------------------------------------------------------------

export const getPantry = (): PantryItem[] => getState().pantry;

export function addPantryItem(item: PantryItem): void {
  update((s) => ({ ...s, pantry: [...s.pantry, item] }));
}

export function updatePantryItem(id: string, change: (item: PantryItem) => PantryItem): void {
  update((s) => ({ ...s, pantry: s.pantry.map((item) => (item.id === id ? change(item) : item)) }));
}

export function removePantryItem(id: string): void {
  update((s) => ({ ...s, pantry: s.pantry.filter((item) => item.id !== id) }));
}

// ---------------------------------------------------------------------------
// Logs and events
// ---------------------------------------------------------------------------

export const getLogs = (): LogEntry[] => getState().logs;

export function addLog(entry: LogEntry): void {
  update((s) => ({ ...s, logs: [...s.logs, entry] }));
}

export function removeLog(id: string): void {
  update((s) => ({ ...s, logs: s.logs.filter((log) => log.id !== id) }));
}

export const getEvents = (): AppEvent[] => getState().events;

export function addEvent(event: AppEvent): void {
  update((s) => ({ ...s, events: [...s.events, event].slice(-MAX_EVENTS) }));
}

// ---------------------------------------------------------------------------
// Whole-app actions
// ---------------------------------------------------------------------------

/** Replace everything, e.g. when loading a demo persona. */
export function replaceState(next: Omit<AppState, "version">): void {
  update(() => ({ ...next, version: STATE_VERSION }));
}

export function resetAll(): void {
  update(() => emptyState());
}
