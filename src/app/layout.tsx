import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Bricolage Grotesque (heavy) for headings and numbers: bold, energetic.
// Plus Jakarta Sans for everything else: clean and very readable on phones.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FuelUp",
  description:
    "Meal plans for off-campus students, built around your effort level, restrictions, budget, and the food you already know.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#123524",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full bg-cream text-ink">{children}</body>
    </html>
  );
}
