"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/Sheet";

/**
 * The floating "+ Log" button, available on every tab.
 * Phase 8 turns the sheet into the real quick-log box.
 */
export function LogButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[5.25rem] z-30 mx-auto flex max-w-md justify-end px-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex min-h-13 items-center gap-2 rounded-full bg-tomato-deep px-5 font-semibold text-white shadow-lift transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <PlusIcon width={20} height={20} />
          Log
        </button>
      </div>

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
