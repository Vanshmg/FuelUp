import { describe, expect, it } from "vitest";
import { DEFAULT_GEMINI_MODEL, resolveGeminiModel } from "@/lib/config";

describe("resolveGeminiModel", () => {
  it("falls back to the default when unset or blank", () => {
    expect(resolveGeminiModel(undefined)).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveGeminiModel("   ")).toBe(DEFAULT_GEMINI_MODEL);
  });

  it("uses the configured model when provided", () => {
    expect(resolveGeminiModel(" gemini-3.5-flash ")).toBe("gemini-3.5-flash");
  });
});
