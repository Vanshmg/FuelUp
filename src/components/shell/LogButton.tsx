"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/Sheet";

/**
 * "+ Log", available on every tab. It lives IN the tab bar (not floating
 * over the page), so it can never cover content.
 * Phase 8 turns the sheet into the real quick-log box.
 */
export function LogButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-1.5 rounded-full bg-orange px-4 font-bold text-forest-deep shadow-lift transition-transform duration-150 hover:scale-[1.04] active:scale-[0.94]"
      >
        <PlusIcon width={18} height={18} />
        Log
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="What did you have?">
        <div className="flex flex-col gap-3">
          <textarea
            disabled
            rows={3}
            placeholder="e.g. chips and a burrito bowl"
            className="w-full resize-none rounded-card border border-line bg-card p-4 text-base placeholder:text-ink-soft/70"
          />
          <p className="text-sm text-ink-soft">
            Quick logging arrives in Phase 8. Until then, FuelUp assumes your plan happened. No logging needed.
          </p>
        </div>
      </Sheet>
    </>
  );
}
