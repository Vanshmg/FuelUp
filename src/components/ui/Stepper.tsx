/** − 4 + : a number picker that's easy to tap. */
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** For screen readers, e.g. "Eggs per week". */
  label: string;
}) {
  const buttonClass =
    "flex size-10 items-center justify-center rounded-full border border-line bg-card text-lg font-semibold " +
    "hover:bg-cream-deep disabled:opacity-40";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={buttonClass} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Fewer">
        −
      </button>
      <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={buttonClass} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="More">
        +
      </button>
    </div>
  );
}
