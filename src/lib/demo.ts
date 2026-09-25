/**
 * "Load demo data": replaces everything with a persona, built for TODAY.
 * `today` defaults to the real current date, so the demo's pantry heads-ups
 * and weekly-limit counts are always relative to when you click the button.
 */
import { todayIso } from "@/lib/dates";
import { getPersona } from "@/lib/data/personas";
import { replaceState } from "@/lib/storage";

export function loadDemoPersona(personaId: string, today: string = todayIso()): boolean {
  const persona = getPersona(personaId);
  if (!persona) return false;
  replaceState(persona.build(today));
  return true;
}
