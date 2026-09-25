import { cn } from "@/lib/cn";

/**
 * The FuelUp mark: a fuel gauge sitting on the rim of a bowl.
 * Food is fuel. The needle rests just short of F: "fueled up, room to grow."
 *
 * `angle` (degrees above horizontal: 180 = E, 0 = F) lets the Phase 11 intro
 * animate the needle sweeping from E to F.
 */
const PIVOT = { x: 24, y: 27 };
const ARC_RADIUS = 15;
const NEEDLE_LENGTH = 13;

function pointAt(angle: number, radius: number) {
  const rad = (Math.PI * angle) / 180;
  return { x: PIVOT.x + radius * Math.cos(rad), y: PIVOT.y - radius * Math.sin(rad) };
}

const TONES = {
  /** On forest green: cream needle, orange bowl. */
  dark: { fg: "#fff8f0", accent: "#f26b1d", word: "text-cream", up: "text-orange" },
  /** On cream or white: forest needle, orange bowl. */
  light: { fg: "#123524", accent: "#f26b1d", word: "text-forest", up: "text-orange-deep" },
};

export function LogoMark({
  size = 32,
  tone = "light",
  angle = 38,
  className,
}: {
  size?: number;
  tone?: keyof typeof TONES;
  angle?: number;
  className?: string;
}) {
  const { fg, accent } = TONES[tone];
  const arcEnd = pointAt(angle, ARC_RADIUS);
  const needleTip = pointAt(angle, NEEDLE_LENGTH);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className={className}>
      {/* Gauge track, then the filled part from E up to the needle */}
      <path d="M9 27 A15 15 0 0 1 39 27" fill="none" stroke={fg} strokeOpacity={0.25} strokeWidth={4} strokeLinecap="round" />
      <path
        d={`M9 27 A15 15 0 0 1 ${arcEnd.x.toFixed(2)} ${arcEnd.y.toFixed(2)}`}
        fill="none"
        stroke={accent}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path d={`M24 27 L${needleTip.x.toFixed(2)} ${needleTip.y.toFixed(2)}`} stroke={fg} strokeWidth={3} strokeLinecap="round" />
      {/* The bowl */}
      <path d="M5 29 H43 C43 38 35 44 24 44 C13 44 5 38 5 29 Z" fill={accent} />
      <circle cx={PIVOT.x} cy={PIVOT.y} r={3.4} fill={fg} />
    </svg>
  );
}

/** Mark + "FuelUp" wordmark. */
export function Logo({ tone = "light", size = 32, className }: { tone?: keyof typeof TONES; size?: number; className?: string }) {
  const { word, up } = TONES[tone];
  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label="FuelUp" role="img">
      <LogoMark size={size} tone={tone} />
      <span aria-hidden className={cn("font-display font-extrabold tracking-tight", word)} style={{ fontSize: size * 0.72 }}>
        Fuel<span className={up}>Up</span>
      </span>
    </span>
  );
}
