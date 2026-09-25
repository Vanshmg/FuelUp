import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryAdapter } from "@/lib/storage/adapters";
import {
  addEvent,
  addPantryItem,
  getPantry,
  getProfile,
  getLoadNotices,
  getState,
  parseSavedState,
  parseState,
  removePantryItem,
  replaceState,
  resetAll,
  setStorageAdapter,
  subscribe,
} from "@/lib/storage";
import { emptyState, type PantryItem } from "@/lib/types";
import { getPersona } from "@/lib/data/personas";
import { migrate } from "@/lib/storage/migrations";

const milk: PantryItem = {
  kind: "grocery",
  id: "p1",
  foodId: "milk",
  purchasedOn: "2026-09-20",
  storage: "fridge",
  opened: false,
};

describe("storage module", () => {
  beforeEach(() => setStorageAdapter(memoryAdapter()));

  it("starts empty when nothing is saved", () => {
    expect(getState()).toEqual(emptyState());
  });

  it("saves changes through the adapter so they survive a reload", () => {
    const adapter = memoryAdapter();
    setStorageAdapter(adapter);
    addPantryItem(milk);

    // Simulate a page reload: same saved data, fresh module cache.
    setStorageAdapter(memoryAdapter(adapter.read()));
    expect(getPantry()).toEqual([milk]);

    removePantryItem("p1");
    expect(getPantry()).toEqual([]);
  });

  it("returns the same object until something changes (React relies on this)", () => {
    const first = getState();
    expect(getState()).toBe(first);
    addPantryItem(milk);
    expect(getState()).not.toBe(first);
  });

  it("notifies subscribers on change, and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    addPantryItem(milk);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    resetAll();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("caps the event history", () => {
    for (let i = 0; i < 1005; i++) addEvent({ id: `e${i}`, type: "skip", date: "2026-09-20" });
    expect(getState().events).toHaveLength(1000);
    expect(getState().events.at(-1)?.id).toBe("e1004");
  });

  it("loads a persona via replaceState", () => {
    replaceState(getPersona("arjun")!.build("2026-09-25"));
    expect(getProfile()?.name).toBe("Arjun");
  });
});

describe("parseState (never crash on bad saved data)", () => {
  it("returns an empty state for missing or corrupted JSON", () => {
    expect(parseState(null)).toEqual(emptyState());
    expect(parseState("{not json")).toEqual(emptyState());
    expect(parseState('"just a string"')).toEqual(emptyState());
  });

  it("keeps valid sections and drops only the broken list entries", () => {
    const saved = {
      ...emptyState(),
      pantry: [milk, { ...milk, id: "p2", foodId: "dragon_fruit_jam" }, { nonsense: true }],
      profile: { effort: "not-a-level" },
    };
    const state = parseState(JSON.stringify(saved));
    expect(state.pantry).toEqual([milk]); // good item kept, 2 broken ones dropped
    expect(state.profile).toBeNull(); // unreadable profile → onboarding again (but backed up, see below)
  });
});

describe("keeping saved profiles through data-model changes", () => {
  const arjun = () => getPersona("arjun")!.build("2026-09-25");

  it("fills in defaults for profile fields added after it was saved", () => {
    const oldProfile: Record<string, unknown> = { ...arjun().profile };
    delete oldProfile.insightDepth; // pretend this field didn't exist yet
    delete oldProfile.proteinTargetG;
    const saved = { ...emptyState(), profile: oldProfile };

    const result = parseSavedState(JSON.stringify(saved));
    expect(result.state.profile).toMatchObject({
      name: "Arjun",
      insightDepth: "casual",
      weeklyLimits: [
        { tag: "egg", maxPerWeek: 4 },
        { tag: "chocolate", maxPerWeek: 3 },
      ],
    });
    expect(result.notices).toEqual([]);
  });

  it("never quietly drops an allergy to make a profile fit", () => {
    const profile = { ...arjun().profile!, avoidTags: ["beef", "mystery_allergen"] };
    const result = parseSavedState(JSON.stringify({ ...emptyState(), profile }));
    // Not accepted with the unknown tag silently removed:
    expect(result.state.profile).toBeNull();
    expect(result.keepBackup).toBe(true);
    expect(result.notices[0]).toContain("couldn't read your saved profile");
  });

  it("backs up unreadable data before anything overwrites it", () => {
    const raw = JSON.stringify({ ...emptyState(), profile: { effort: "not-a-level" } });
    const adapter = memoryAdapter(raw);
    setStorageAdapter(adapter);

    expect(getLoadNotices()).toHaveLength(1);
    addPantryItem(milk); // the app writes new data...
    expect(adapter.readBackup()).toBe(raw); // ...but the original is kept
  });

  it("treats data saved from a newer app version as unreadable, with a backup", () => {
    const result = parseSavedState(JSON.stringify({ ...emptyState(), version: 99 }));
    expect(result.keepBackup).toBe(true);
    expect(result.state).toEqual(emptyState());
  });
});

describe("migrate", () => {
  const steps = {
    1: (data: Record<string, unknown>) => ({ ...data, renamed: data.old, old: undefined }),
    2: (data: Record<string, unknown>) => ({ ...data, added: true }),
  };

  it("runs each step in order up to the target version", () => {
    const result = migrate({ version: 1, old: "x" }, steps, 3);
    expect(result).toEqual({ ok: true, data: { version: 3, renamed: "x", old: undefined, added: true } });
  });

  it("treats unversioned data as version 1", () => {
    expect(migrate({ old: "x" }, steps, 3)).toMatchObject({ ok: true, data: { version: 3, renamed: "x" } });
  });

  it("fails clearly when a step is missing", () => {
    expect(migrate({ version: 1 }, { 1: steps[1] }, 3)).toEqual({ ok: false, reason: "missing_step", version: 2 });
  });

  it("does nothing for current data", () => {
    expect(migrate({ version: 1, a: 1 }, {}, 1)).toEqual({ ok: true, data: { version: 1, a: 1 } });
  });
});
