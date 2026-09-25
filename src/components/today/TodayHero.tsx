import { DAY_TYPE_LABELS } from "@/lib/data/labels";
import { addDays, todayIso, weekdayOf } from "@/lib/dates";
import type { Profile } from "@/lib/types";

/** Tomorrow's numbers. Undefined until there's a plan (Phase 5–6). */
export interface DayStats {
  kcal: number;
  protein: number;
  cost: number;
}

/**
 * The forest-green top of the Today tab: tomorrow's day type, a greeting,
 * three stat tiles, and the protein bar. Numbers are estimates from code
 * (catalog data), never from the AI.
 */
export function TodayHero({ profile, stats }: { profile: Profile; stats?: DayStats }) {
  const tomorrow = addDays(todayIso(), 1);
  const dayType = DAY_TYPE_LABELS[profile.dayTypes[weekdayOf(tomorrow)]];
  const proteinShare = stats ? Math.min(100, Math.round((stats.protein / profile.proteinTargetG) * 100)) : 0;

  const tiles: [string, string][] = [
    [stats ? stats.kcal.toLocaleString("en-US") : "—", "kcal est."],
    [stats ? `${stats.protein}g` : "—", "protein"],
    [stats ? `$${stats.cost.toFixed(2)}` : "—", "food cost"],
  ];

  return (
    <section className="-mx-5 -mt-5 rounded-b-[1.75rem] bg-forest px-5 pt-3 pb-6 text-cream">
      <p className="text-xs font-bold tracking-widest text-sage uppercase">Tomorrow · {dayType}</p>
      <h1 className="mt-1.5 font-display text-[2.1rem] leading-none font-extrabold tracking-tight">
        {profile.name ? `Game plan, ${profile.name}` : "Your game plan"} <span aria-hidden>🔥</span>
      </h1>

      <dl className="mt-5 grid grid-cols-3 gap-2.5">
        {tiles.map(([value, label]) => (
          <div key={label} className="flex flex-col rounded-2xl bg-forest-tile px-3 py-2.5">
            <dd className="font-display text-[1.4rem] leading-tight font-extrabold text-orange-bright tabular-nums">{value}</dd>
            <dt className="order-last text-xs font-semibold text-sage">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-2.5 rounded-2xl bg-forest-tile px-4 py-3">
        <div className="flex items-baseline justify-between text-sm font-semibold">
          <span className="text-sage">Protein</span>
          <span>
            <span className="font-display text-lg font-extrabold text-orange-bright">{stats ? `${stats.protein}g` : "—"}</span>
            <span className="text-sage"> / {profile.proteinTargetG}g goal</span>
          </span>
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-forest-line"
          role="progressbar"
          aria-label="Protein toward tomorrow's goal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={proteinShare}
        >
          <div
            className="h-full animate-fill rounded-full bg-gradient-to-r from-orange-bright to-orange"
            style={{ "--fill": `${proteinShare}%` } as React.CSSProperties}
          />
        </div>
        {!stats && <p className="mt-2 text-xs text-sage">Your plan fills this in.</p>}
      </div>
    </section>
  );
}
