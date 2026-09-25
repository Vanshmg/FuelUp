/**
 * Group tags: one tag that stands for several.
 *
 * "poultry" means chicken + turkey + duck. It's a shortcut for users ("I eat
 * no poultry at all") and stays valid in saved profiles. Foods are always
 * tagged with the specific member (a test checks this), and every safety
 * check expands groups first.
 *
 * A weekly limit on a group counts its members TOGETHER: "poultry max 3"
 * means 3 poultry meals in total, not 3 of each.
 */
import type { AvoidTag } from "@/lib/types";

export const TAG_GROUPS: Partial<Record<AvoidTag, AvoidTag[]>> = {
  poultry: ["chicken", "turkey", "duck"],
};

export function isGroupTag(tag: AvoidTag): boolean {
  return tag in TAG_GROUPS;
}

/** Replace group tags with their members; no duplicates. */
export function expandTags(tags: readonly AvoidTag[]): AvoidTag[] {
  return [...new Set(tags.flatMap((tag) => TAG_GROUPS[tag] ?? [tag]))];
}

/** For display: replace a complete set of members with its group ("All poultry"). */
export function collapseTags(tags: readonly AvoidTag[]): AvoidTag[] {
  let result = expandTags(tags);
  for (const [group, members] of Object.entries(TAG_GROUPS) as [AvoidTag, AvoidTag[]][]) {
    if (members.every((m) => result.includes(m))) {
      const at = result.indexOf(members[0]);
      result = result.filter((t) => !members.includes(t));
      result.splice(at, 0, group);
    }
  }
  return result;
}

/** The group a tag belongs to, if any (chicken → poultry). */
export function groupOf(tag: AvoidTag): AvoidTag | undefined {
  return (Object.entries(TAG_GROUPS) as [AvoidTag, AvoidTag[]][]).find(([, members]) => members.includes(tag))?.[0];
}
