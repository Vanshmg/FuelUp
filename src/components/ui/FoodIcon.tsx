import { getFood } from "@/lib/data/foods";
import { foodEmoji } from "@/lib/data/icons";
import { cn } from "@/lib/cn";
import type { FoodId } from "@/lib/types";

const SIZES = {
  sm: "size-8 text-base",
  md: "size-11 text-2xl",
  lg: "size-14 text-3xl",
};

/** A food's emoji on a soft round tile. Falls back to the role icon (🫘 legumes, 🧀 dairy…). */
export function FoodIcon({ foodId, size = "md" }: { foodId: FoodId; size?: keyof typeof SIZES }) {
  const food = getFood(foodId);
  return (
    <span
      role="img"
      aria-label={food.name}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-cream-deep", SIZES[size])}
    >
      {foodEmoji(food)}
    </span>
  );
}
