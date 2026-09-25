/**
 * The ONLY file that talks to Gemini. Server-only: the key is read from
 * process.env here and never sent to the browser, printed, or logged.
 *
 * To swap models or providers, change this file; everything else uses the
 * small JsonAi function type.
 */
import "server-only";
import { GoogleGenAI } from "@google/genai";
import { resolveGeminiModel } from "@/lib/config";
import type { JsonAi } from "./types";

const TIMEOUT_MS = 60_000;

/**
 * Gemini sometimes answers 503 "high demand" or 429 "slow down". We wait
 * briefly and retry, then try a backup model, before the pipeline falls
 * back to a built-in plan. ("gemini-flash-latest" is Google's alias for its
 * current stable Flash model.)
 */
const BACKUP_MODELS = ["gemini-flash-latest"];
const TRIES_PER_MODEL = 2;
const BUSY_WAIT_MS = 1_500;

function isBusyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(503|429)\b|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(message);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A JsonAi backed by Gemini, or null when no key is configured. */
export function geminiJsonAi(): JsonAi | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const client = new GoogleGenAI({ apiKey });
  const primary = resolveGeminiModel(process.env.GEMINI_MODEL);
  const models = [primary, ...BACKUP_MODELS.filter((m) => m !== primary)];

  return async (prompt, jsonSchema) => {
    let lastError: unknown;
    for (const model of models) {
      for (let attempt = 0; attempt < TRIES_PER_MODEL; attempt++) {
        try {
          const response = await client.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseJsonSchema: jsonSchema,
              temperature: 0.7,
              abortSignal: AbortSignal.timeout(TIMEOUT_MS),
            },
          });
          const text = response.text;
          if (!text) throw new Error("Gemini returned an empty response.");
          return JSON.parse(text);
        } catch (error) {
          if (!isBusyError(error)) throw error; // a real error: don't hammer the API
          lastError = error;
          await wait(BUSY_WAIT_MS * (attempt + 1));
        }
      }
    }
    throw lastError;
  };
}

/**
 * Dev-only: FUELUP_DEBUG_FORCE_RETRY=1 slips an unknown ingredient into the
 * FIRST reply, so you can watch the retry happen in the real app.
 */
export function withDebugForcedRetry(ai: JsonAi): JsonAi {
  if (process.env.NODE_ENV === "production" || process.env.FUELUP_DEBUG_FORCE_RETRY !== "1") return ai;
  let first = true;
  return async (prompt, schema) => {
    const raw = await ai(prompt, schema);
    if (first) {
      first = false;
      const meal = (raw as { days?: { meals?: { ingredients?: unknown[] }[] }[] })?.days?.[0]?.meals?.[0];
      meal?.ingredients?.push({ food: "mystery sauce", servings: 1 });
    }
    return raw;
  };
}
