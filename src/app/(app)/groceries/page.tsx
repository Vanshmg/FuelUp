import { EmptyState } from "@/components/ui/Card";

export default function GroceriesPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-semibold">Groceries</h1>
      <EmptyState emoji="🛒" title="Your list and your kitchen">
        Phase 7 adds the grocery list from your plan, your usuals, the budget, and what&apos;s at home with friendly
        heads-ups before things go bad.
      </EmptyState>
    </div>
  );
}
