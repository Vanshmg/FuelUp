import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadDemoPersona } from "@/lib/demo";
import { memoryAdapter } from "@/lib/storage/adapters";
import { getLogs, getPantry, getProfile, setStorageAdapter } from "@/lib/storage";

describe("Load demo data", () => {
  beforeEach(() => setStorageAdapter(memoryAdapter()));
  afterEach(() => vi.useRealTimers());

  it("builds the persona for the REAL current date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 0, 15, 9, 30)); // Jan 15, 2027, local time

    expect(loadDemoPersona("arjun")).toBe(true);
    expect(getProfile()?.name).toBe("Arjun");
    // Arjun's chicken was bought "today" and his egg bhurji was "yesterday".
    expect(getPantry().find((p) => p.kind === "grocery" && p.foodId === "chicken_thigh")).toMatchObject({
      purchasedOn: "2027-01-15",
    });
    expect(getLogs()[0].date).toBe("2027-01-14");
  });

  it("returns false for an unknown persona and changes nothing", () => {
    expect(loadDemoPersona("nobody")).toBe(false);
    expect(getProfile()).toBeNull();
  });
});
