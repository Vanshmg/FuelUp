import { cn } from "@/lib/cn";

/**
 * A tappable pill: emoji + label. `selected` shows the choice is on.
 * `locked` means it's on because of something else (e.g. vegetarian → no chicken).
 */
export function Chip({
  emoji,
  label,
  selected = false,
  locked = false,
  onToggle,
}: {
  emoji?: string;
  label: string;
  selected?: boolean;
  locked?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={locked}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
        selected
          ? "border-tomato bg-tomato-soft text-ink"
          : "border-line bg-card text-ink hover:border-tomato/50 hover:bg-cream-deep",
        locked && "cursor-default opacity-70",
      )}
    >
      {emoji && (
        <span aria-hidden className="text-lg leading-none">
          {emoji}
        </span>
      )}
      {label}
      {selected && (
        <span aria-hidden className="text-tomato-deep">
          ✓
        </span>
      )}
    </button>
  );
}
