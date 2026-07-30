import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DN Classic SEA - Monster Card DB",
  description: "Dragon Nest Classic SEA Monster Cards - 77 cards, 5 rarities, full filter by stats",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#0b0e14] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
