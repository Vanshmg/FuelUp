"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { PersonaPicker } from "@/components/PersonaPicker";
import { ProfileSummary } from "@/components/ProfileSummary";
import { resetAll } from "@/lib/storage";
import type { Profile } from "@/lib/types";

/** Your setup, demo personas, and "start over". */
export function MenuSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: Profile }) {
  const router = useRouter();
  const [confirmingReset, setConfirmingReset] = useState(false);

  function close() {
    setConfirmingReset(false);
    onClose();
  }

  function startOver() {
    resetAll();
    close();
    router.replace("/onboarding");
  }

  return (
    <Sheet open={open} onClose={close} title={profile.name ? `Hi, ${profile.name}` : "Your setup"}>
      <div className="flex flex-col gap-6">
        <Card>
          <ProfileSummary profile={profile} />
        </Card>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-ink-soft">Try a demo persona</h3>
          <PersonaPicker onLoaded={close} />
        </section>

        <section className="flex flex-col gap-3">
          {confirmingReset ? (
            <Card className="flex flex-col gap-3 border-chili/30 bg-chili-soft">
              <p className="text-sm">This clears your profile, plan, groceries, and logs on this device.</p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={startOver}>
                  Yes, start over
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingReset(false)}>
                  Keep my data
                </Button>
              </div>
            </Card>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmingReset(true)}>
              Start over
            </Button>
          )}
        </section>

        <p className="text-center text-xs leading-relaxed text-ink-soft">
          Always check labels. FuelUp helps you plan; it isn&apos;t medical advice.
        </p>
      </div>
    </Sheet>
  );
}
