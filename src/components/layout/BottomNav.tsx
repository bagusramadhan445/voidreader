"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Bookmark, Settings } from "lucide-react";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  // Hide on reader mode
  if (pathname.startsWith("/reader/")) {
    return null;
  }

  const navItems = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "Jelajahi", href: "/explore", icon: Compass },
    { label: "Koleksi", href: "/library", icon: Bookmark },
    { label: "Pengaturan", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080B14]/95 backdrop-blur-lg border-t border-gray-800/80 px-2 py-1.5 flex items-center justify-around safe-area-bottom">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
              isActive ? "text-[#00E5FF]" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
              )}
            </div>
            <span className="text-[11px] font-medium mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
