import { Chip } from "@/components/ui/Chip";
import { CUISINE_OPTIONS } from "@/lib/data/labels";
import type { Cuisine } from "@/lib/types";

export function CuisineStep({ value, onChange }: { value: Cuisine[]; onChange: (value: Cuisine[]) => void }) {
  const toggle = (cuisine: Cuisine) =>
    onChange(value.includes(cuisine) ? value.filter((c) => c !== cuisine) : [...value, cuisine]);

  return (
    <div className="flex flex-wrap gap-2.5" role="group" aria-label="Cuisines">
      {(Object.keys(CUISINE_OPTIONS) as Cuisine[]).map((cuisine) => (
        <Chip
          key={cuisine}
          emoji={CUISINE_OPTIONS[cuisine].emoji}
          label={CUISINE_OPTIONS[cuisine].label}
          selected={value.includes(cuisine)}
          onToggle={() => toggle(cuisine)}
        />
      ))}
    </div>
  );
}
