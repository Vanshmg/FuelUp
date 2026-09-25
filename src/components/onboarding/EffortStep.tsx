import { cn } from "@/lib/cn";
import { EFFORT_OPTIONS } from "@/lib/data/labels";
import type { EffortLevel } from "@/lib/types";

export function EffortStep({ value, onChange }: { value: EffortLevel | null; onChange: (value: EffortLevel) => void }) {
  return (
    <div role="radiogroup" aria-label="Effort level" className="flex flex-col gap-3">
      {(Object.keys(EFFORT_OPTIONS) as EffortLevel[]).map((level) => {
        const option = EFFORT_OPTIONS[level];
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(level)}
            className={cn(
              "flex items-center gap-4 rounded-card border-2 p-4 text-left shadow-soft transition-colors",
              selected ? "border-orange bg-orange-soft" : "border-transparent bg-card hover:border-line",
            )}
          >
            <span
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-full text-3xl",
                selected ? "bg-card" : "bg-cream-deep",
              )}
              aria-hidden
            >
              {option.emoji}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-display text-lg font-extrabold">{option.label}</span>
              <span className="text-sm text-ink-soft">{option.blurb}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
