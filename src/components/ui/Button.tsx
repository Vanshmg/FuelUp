import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "onDark";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // Dark green text on orange: 5.6:1 contrast (white on this orange would fail AA).
  primary: "bg-orange text-forest-deep shadow-lift hover:bg-orange-bright disabled:shadow-none",
  secondary: "bg-card text-ink border border-line shadow-soft hover:bg-cream-deep",
  ghost: "text-ink-soft hover:bg-cream-deep hover:text-ink",
  danger: "bg-chili text-white hover:bg-[#9e2a21]",
  /** Secondary button on a forest-green background. */
  onDark: "border border-forest-line text-cream hover:bg-forest-tile",
};

const SIZES: Record<Size, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-13 px-6 text-base w-full",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-bold",
        // Press in, spring back: the button reacts to your thumb.
        "transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
