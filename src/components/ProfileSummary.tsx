import { effectiveAvoidTags } from "@/lib/safety/allergens";
import { AVOID_OPTIONS, CUISINE_OPTIONS, DIET_OPTIONS, EFFORT_OPTIONS } from "@/lib/data/labels";
import { formatUsd } from "@/lib/safety/budget";
import type { Profile } from "@/lib/types";

/** What FuelUp knows about you, in plain words. */
export function ProfileSummary({ profile }: { profile: Profile }) {
  const effort = EFFORT_OPTIONS[profile.effort];
  const never = effectiveAvoidTags(profile);

  const rows: [string, React.ReactNode][] = [
    ["Effort", `${effort.emoji} ${effort.label}`],
    ["Cuisines", profile.cuisines.map((c) => `${CUISINE_OPTIONS[c].emoji} ${CUISINE_OPTIONS[c].label}`).join(" · ")],
    ["Diet", `${DIET_OPTIONS[profile.diet].emoji} ${DIET_OPTIONS[profile.diet].label}`],
    ["Never", never.length ? never.map((tag) => `${AVOID_OPTIONS[tag].emoji} ${AVOID_OPTIONS[tag].label}`).join(" · ") : "Nothing"],
    [
      "Limits",
      profile.weeklyLimits.length
        ? profile.weeklyLimits
            .map((limit) => `${AVOID_OPTIONS[limit.tag].emoji} ${AVOID_OPTIONS[limit.tag].label} max ${limit.maxPerWeek}× / 7 days`)
            .join(" · ")
        : "None",
    ],
    ["Budget", `${formatUsd(profile.weeklyBudget)} a week`],
  ];

  return (
    <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-semibold text-ink-soft">{label}</dt>
          <dd className="text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
