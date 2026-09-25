import { Chip } from "@/components/ui/Chip";
import { Stepper } from "@/components/ui/Stepper";
import { DIET_AVOIDS } from "@/lib/data/diets";
import { AVOID_OPTIONS, DIET_OPTIONS } from "@/lib/data/labels";
import { expandTags, groupOf, isGroupTag, TAG_GROUPS } from "@/lib/data/tagGroups";
import { AVOID_TAGS, type AvoidTag, type Diet } from "@/lib/types";
import type { OnboardingAnswers } from "./OnboardingFlow";

const DEFAULT_LIMIT = 3;

/**
 * Diet, hard avoids ("never"), and weekly limits ("sometimes, but not too often").
 * - A tag can't be both: choosing "never" removes its limit.
 * - "All poultry" is a shortcut: it covers chicken, turkey, and duck, and a
 *   poultry LIMIT counts all three together.
 */
export function RestrictionsStep({
  answers,
  onChange,
}: {
  answers: OnboardingAnswers;
  onChange: (change: Partial<OnboardingAnswers>) => void;
}) {
  const fromDiet = DIET_AVOIDS[answers.diet];
  const never = new Set<AvoidTag>(expandTags([...answers.avoidTags, ...fromDiet]));
  const limited = new Set(answers.weeklyLimits.map((limit) => limit.tag));

  /** Is this chip "on" in the Never section? A group is on when all its members are. */
  const isNever = (tag: AvoidTag) => expandTags([tag]).every((t) => never.has(t));
  /** On because of something else (the diet, or the "All poultry" shortcut). */
  const isLockedNever = (tag: AvoidTag) => {
    const coveredByDiet = expandTags([tag]).every((t) => fromDiet.includes(t));
    const group = groupOf(tag);
    return coveredByDiet || (group !== undefined && answers.avoidTags.includes(group));
  };

  /** Remove limits that a "never" choice now covers. */
  const limitsWithout = (covered: Set<AvoidTag>) =>
    answers.weeklyLimits.filter((limit) => !expandTags([limit.tag]).some((t) => covered.has(t)));

  function setDiet(diet: Diet) {
    onChange({ diet, weeklyLimits: limitsWithout(new Set(expandTags(DIET_AVOIDS[diet]))) });
  }

  function toggleNever(tag: AvoidTag) {
    if (answers.avoidTags.includes(tag)) {
      onChange({ avoidTags: answers.avoidTags.filter((t) => t !== tag) });
      return;
    }
    // Choosing a group replaces its individual members (they're implied now).
    const members = TAG_GROUPS[tag] ?? [];
    onChange({
      avoidTags: [...answers.avoidTags.filter((t) => !members.includes(t)), tag],
      weeklyLimits: limitsWithout(new Set(expandTags([tag]))),
    });
  }

  function toggleLimit(tag: AvoidTag) {
    onChange({
      weeklyLimits: limited.has(tag)
        ? answers.weeklyLimits.filter((limit) => limit.tag !== tag)
        : [...answers.weeklyLimits, { tag, maxPerWeek: DEFAULT_LIMIT }],
    });
  }

  function setLimit(tag: AvoidTag, maxPerWeek: number) {
    onChange({ weeklyLimits: answers.weeklyLimits.map((limit) => (limit.tag === tag ? { tag, maxPerWeek } : limit)) });
  }

  // A tag (or group) can be limited only if none of it is already "never".
  const limitable = AVOID_TAGS.filter((tag) => !expandTags([tag]).some((t) => never.has(t)));

  return (
    <div className="flex flex-col gap-8">
      <Section title="Diet">
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Diet">
          {(Object.keys(DIET_OPTIONS) as Diet[]).map((diet) => (
            <Chip
              key={diet}
              emoji={DIET_OPTIONS[diet].emoji}
              label={DIET_OPTIONS[diet].label}
              selected={answers.diet === diet}
              onToggle={() => setDiet(diet)}
            />
          ))}
        </div>
      </Section>

      <Section title="Never" hint="Allergies and hard no's. FuelUp will never suggest these, including hidden ones like mayo or satay.">
        <div className="flex flex-wrap gap-2.5">
          {AVOID_TAGS.map((tag) => (
            <Chip
              key={tag}
              emoji={AVOID_OPTIONS[tag].emoji}
              label={AVOID_OPTIONS[tag].label}
              selected={isNever(tag)}
              locked={isLockedNever(tag)}
              onToggle={() => toggleNever(tag)}
            />
          ))}
        </div>
        {fromDiet.length > 0 && (
          <p className="text-xs text-ink-soft">{DIET_OPTIONS[answers.diet].label} already covers the locked ones.</p>
        )}
      </Section>

      <Section title="Limit per week" hint="Okay sometimes, not too often. Counted over any 7 days in a row. Optional.">
        <div className="flex flex-wrap gap-2.5">
          {limitable.map((tag) => (
            <Chip
              key={tag}
              emoji={AVOID_OPTIONS[tag].emoji}
              label={AVOID_OPTIONS[tag].label}
              selected={limited.has(tag)}
              onToggle={() => toggleLimit(tag)}
            />
          ))}
        </div>
        {answers.weeklyLimits.length > 0 && (
          <ul className="mt-2 flex flex-col divide-y divide-line rounded-card border border-line bg-card">
            {answers.weeklyLimits.map((limit) => (
              <li key={limit.tag} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm font-medium">
                  <span aria-hidden>{AVOID_OPTIONS[limit.tag].emoji} </span>
                  {AVOID_OPTIONS[limit.tag].label}: max per 7 days
                  {isGroupTag(limit.tag) && <span className="block text-xs font-normal text-ink-soft">counted together</span>}
                </span>
                <Stepper
                  label={`${AVOID_OPTIONS[limit.tag].label} per 7 days`}
                  value={limit.maxPerWeek}
                  min={1}
                  max={14}
                  onChange={(value) => setLimit(limit.tag, value)}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="rounded-card bg-cream-deep p-4 text-xs leading-relaxed text-ink-soft">
        Always check labels. FuelUp helps you plan; it isn&apos;t medical advice.
      </p>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-xl font-extrabold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
