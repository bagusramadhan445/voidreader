import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Void Tools - Central Utility Hub",
  description:
    "Pusat utilitas terpadu VoidVerse: AI, Downloader, Scraper, Forge, Document, dan Developer tools.",
};

export default function VoidToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-28 pt-20 bg-[#080B14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
