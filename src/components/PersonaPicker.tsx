"use client";

import { useRouter } from "next/navigation";
import { loadDemoPersona } from "@/lib/demo";
import { PERSONAS } from "@/lib/data/personas";

/** "Load demo data": one card per persona. Loading uses today's real date. */
export function PersonaPicker({ onLoaded }: { onLoaded?: () => void }) {
  const router = useRouter();

  function load(id: string) {
    if (loadDemoPersona(id)) {
      onLoaded?.();
      router.replace("/today");
    }
  }

  return (
    <ul className="flex flex-col gap-3">
      {PERSONAS.map((persona) => (
        <li key={persona.id}>
          <button
            type="button"
            onClick={() => load(persona.id)}
            className="flex w-full items-start gap-4 rounded-card border border-line bg-card p-4 text-left shadow-soft transition-colors hover:border-tomato/50 hover:bg-cream-deep"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cream-deep text-2xl" aria-hidden>
              {persona.emoji}
            </span>
            <span className="flex flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-lg font-semibold">{persona.name}</span>
                <span className="text-xs font-semibold tracking-wide text-tomato-deep uppercase">{persona.userType}</span>
              </span>
              <span className="text-sm text-ink">{persona.tagline}</span>
              <span className="text-xs text-ink-soft">Tests: {persona.tests}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
