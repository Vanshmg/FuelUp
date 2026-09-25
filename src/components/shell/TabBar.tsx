"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BasketIcon, PlateIcon, SparkIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/today", label: "Today", Icon: PlateIcon },
  { href: "/groceries", label: "Groceries", Icon: BasketIcon },
  { href: "/insights", label: "Insights", Icon: SparkIcon },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 bg-forest">
      <ul className="mx-auto flex max-w-md justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 pt-2.5 pb-1 text-xs font-semibold transition-colors",
                  active ? "text-orange-bright" : "text-sage hover:text-cream",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200",
                    active && "animate-pop bg-forest-tile",
                  )}
                >
                  <Icon />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
