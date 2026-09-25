/**
 * The AI, as the rest of the app sees it: "send a prompt and a JSON schema,
 * get JSON back". Keeping it this small means:
 * - the model can be swapped in one file (ai/gemini.ts);
 * - tests pass a fake function instead of calling Gemini.
 */
export type JsonAi = (prompt: string, jsonSchema: object) => Promise<unknown>;
