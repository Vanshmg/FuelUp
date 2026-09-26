import { DAY_TYPE_LABELS } from "@/lib/data/labels";
import { addDays, todayIso, weekdayOf } from "@/lib/dates";
import type { Profile } from "@/lib/types";

/** Tomorrow's numbers. Undefined until there's a plan. */
export interface DayStats {
  kcal: number;
  protein: number;
  cost: number;
}

/**
 * The forest-green top of the Today tab: tomorrow's day type, a greeting,
 * three stat tiles, and the protein bar. Numbers are estimates from code
 * (catalog data), never from the AI.
 *
 * Phones: full-bleed under the header, tiles in a row with the protein bar
 * below. Wide screens: a rounded card with all four in one even row.
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
    <section className="-mx-5 -mt-5 rounded-b-[1.75rem] bg-forest px-5 pt-3 pb-6 text-cream lg:mx-0 lg:mt-0 lg:rounded-[1.75rem] lg:px-8 lg:py-7">
      <p className="text-xs font-bold tracking-widest text-sage uppercase">Tomorrow · {dayType}</p>
      <h1 className="mt-1.5 font-display text-[2.1rem] leading-none font-extrabold tracking-tight lg:text-5xl">
        {profile.name ? `Game plan, ${profile.name}` : "Your game plan"} <span aria-hidden>🔥</span>
      </h1>

      <div className="mt-5 flex flex-col gap-2.5 lg:grid lg:grid-cols-4 lg:gap-3">
        {/* lg:contents lets the three tiles join the parent's 4-column row. */}
        <dl className="grid grid-cols-3 gap-2.5 lg:contents">
          {tiles.map(([value, label]) => (
            <div key={label} className="flex flex-col rounded-2xl bg-forest-tile px-3 py-2.5 lg:px-4 lg:py-3.5">
              <dd className="font-display text-[1.4rem] leading-tight font-extrabold text-orange-bright tabular-nums lg:text-3xl">
                {value}
              </dd>
              <dt className="order-last text-xs font-semibold text-sage">{label}</dt>
            </div>
          ))}
        </dl>

        <div className="rounded-2xl bg-forest-tile px-4 py-3 lg:flex lg:flex-col lg:justify-center">
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
      </div>
    </section>
  );
}
