"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { VoidLogo } from "../ui/VoidLogo";
import { Search, Compass, Bookmark, Settings, Home, Sparkles, User, LogIn, Heart } from "lucide-react";
import { getCurrentUser, onAuthStateChange } from "@/lib/supabase/auth";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { AVAILABLE_SOURCES, getStoredSourceId } from "@/lib/source-storage";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [activeSourceId, setActiveSourceId] = useState("komiku");

  useEffect(() => {
    setActiveSourceId(getStoredSourceId());
    const handleSourceChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ sourceId: string }>;
      if (customEvent.detail?.sourceId) {
        setActiveSourceId(customEvent.detail.sourceId);
      }
    };
    window.addEventListener("void_source_changed", handleSourceChanged);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    getCurrentUser().then(setUser);
    const { data: authSub } = onAuthStateChange((_event, _session, newUser) => {
      setUser(newUser);
    });

    return () => {
      window.removeEventListener("void_source_changed", handleSourceChanged);
      window.removeEventListener("scroll", handleScroll);
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const currentSourceMeta =
    AVAILABLE_SOURCES.find((s) => s.id === activeSourceId) || AVAILABLE_SOURCES[0];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "Jelajahi", href: "/explore", icon: Compass },
    { label: "Mengikuti", href: "/following", icon: Heart },
    { label: "Koleksi", href: "/library", icon: Bookmark },
    { label: "Pengaturan", href: "/settings", icon: Settings },
  ];

  // In reader view, we hide default navbar to allow full immersion
  if (pathname.startsWith("/reader/")) {
    return null;
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? "bg-[#080B14]/90 backdrop-blur-md border-b border-cyan-500/10 shadow-lg shadow-black/40"
          : "bg-gradient-to-b from-[#080B14]/95 via-[#080B14]/60 to-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="shrink-0">
          <VoidLogo size="md" />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/15 text-[#00E5FF] border border-cyan-500/30 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#00E5FF]" : "text-gray-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Search & Source Pill */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-48 md:w-64 lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari manga, manhwa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111827]/90 text-sm text-gray-100 placeholder-gray-500 pl-9.5 pr-4 py-1.5 rounded-full border border-gray-800 hover:border-cyan-500/30 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 transition-all shadow-inner"
            />
          </form>

          {/* Source Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-300">
            <Sparkles className="w-3 h-3 text-[#00E5FF] animate-pulse" />
            <span className="font-mono font-medium">{currentSourceMeta.label}</span>
          </div>

          {/* User Auth / Profile Button */}
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-full bg-[#111827] border border-cyan-500/30 hover:border-[#00E5FF] transition-all group shadow-[0_0_12px_rgba(0,229,255,0.15)]"
              title="Profil Pengguna"
            >
              <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 overflow-hidden flex items-center justify-center text-[#00E5FF]">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <span className="hidden sm:inline text-xs font-bold text-gray-200 group-hover:text-white max-w-[100px] truncate">
                {user.user_metadata?.username || user.email?.split("@")[0]}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00E5FF] hover:bg-cyan-300 text-black text-xs font-extrabold shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </Link>
          )}

          {/* Mobile search trigger */}
          <Link
            href="/explore"
            className="sm:hidden p-2 rounded-full text-gray-300 hover:text-[#00E5FF] hover:bg-white/5"
          >
            <Search className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
