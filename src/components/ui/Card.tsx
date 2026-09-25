import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-card p-5 shadow-soft", className)} {...props} />;
}

/** A friendly placeholder for screens with nothing to show yet. */
export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="mb-1 text-5xl" aria-hidden>
        {emoji}
      </span>
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      {children && <div className="max-w-xs text-sm leading-relaxed text-ink-soft">{children}</div>}
    </Card>
  );
}
