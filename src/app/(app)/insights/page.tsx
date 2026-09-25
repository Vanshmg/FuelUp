import { EmptyState } from "@/components/ui/Card";

export default function InsightsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-extrabold">Insights</h1>
      <EmptyState emoji="📈" title="Patterns, not precision">
        Phase 9 adds your week at a glance, patterns across days, and a weekly recap. No streaks, no guilt.
      </EmptyState>
    </div>
  );
}
