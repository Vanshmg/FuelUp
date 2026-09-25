import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { PlanGap } from "@/lib/types";
import { SLOT_LABELS } from "./MealRow";

/**
 * A slot left empty because nothing safe was found. The unsafe meal is never
 * shown; only why it was taken out, and a way to try again.
 */
export function GapCard({
  gap,
  busy,
  disabled,
  onRegenerate,
}: {
  gap: PlanGap;
  busy: boolean;
  disabled: boolean;
  onRegenerate: () => void;
}) {
  return (
    <li className="my-2 rounded-2xl border-2 border-dashed border-line bg-cream p-3">
      <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">{SLOT_LABELS[gap.slot]}</p>
      <p className="mt-0.5 text-sm font-semibold">No safe option here yet.</p>
      <p className="mt-0.5 text-xs text-ink-soft">
        We took a suggestion out for your safety: {gap.reasons[0]?.replace(/^[A-Z][a-z]{2} \w+: /, "") ?? "it didn't pass the check."}
      </p>
      <Button variant="secondary" className="mt-2" onClick={onRegenerate} disabled={disabled} aria-busy={busy}>
        {busy ? (
          <>
            <Spinner className="size-4" /> Finding a safe option…
          </>
        ) : (
          "Tap to regenerate"
        )}
      </Button>
    </li>
  );
}
