import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

/**
 * "Build my week". Disabled while planning, so a double tap can't fire two
 * Gemini calls (usePlan also guards against it).
 */
export function BuildWeekButton({
  building,
  hasPlan,
  onBuild,
}: {
  building: boolean;
  hasPlan: boolean;
  onBuild: () => void;
}) {
  return (
    <Button
      size="lg"
      variant={hasPlan ? "secondary" : "primary"}
      onClick={onBuild}
      disabled={building}
      aria-busy={building}
    >
      {building ? (
        <>
          <Spinner /> Planning your week and checking every meal…
        </>
      ) : hasPlan ? (
        "Rebuild my week"
      ) : (
        "Build my week"
      )}
    </Button>
  );
}
