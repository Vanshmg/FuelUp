"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * A bottom sheet: slides up over the page, like a native mobile app.
 * Closes on backdrop tap, the close button, or Escape.
 *
 * Rendered into <body> with a portal. Otherwise a parent with a blur effect
 * (like the sticky header) traps "position: fixed" inside its own box.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-ink/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[88vh] w-full max-w-md animate-sheet-up overflow-y-auto rounded-t-[1.75rem] bg-cream px-5 pt-3 pb-8 shadow-soft outline-none"
      >
        <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="font-display text-2xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-full text-xl text-ink-soft hover:bg-cream-deep"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
