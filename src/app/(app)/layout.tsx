import { AppShell } from "@/components/shell/AppShell";

/** Every tab (Today, Groceries, Insights) shares the header, tab bar, and "+ Log". */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
