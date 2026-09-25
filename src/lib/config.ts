/**
 * App-wide settings that don't belong in any single feature.
 * The Gemini model lives here so swapping models is a one-line change.
 */

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

/** Use the model from GEMINI_MODEL if set, otherwise the default. */
export function resolveGeminiModel(envValue: string | undefined): string {
  const trimmed = envValue?.trim();
  return trimmed ? trimmed : DEFAULT_GEMINI_MODEL;
}
