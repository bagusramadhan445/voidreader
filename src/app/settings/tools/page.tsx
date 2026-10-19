"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toolRegistry, TOOL_CATEGORIES } from "@/lib/tools/registry";
import { ToolCard } from "@/components/tools/ToolCard";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { ApiConfigModal } from "@/components/tools/ApiConfigModal";
import { getToolsSettings } from "@/lib/tools/storage";
import { ToolCategoryId, ToolDefinition } from "@/lib/tools/types";
import {
  Wrench,
  Search,
  Sparkles,
  Key,
  Layers,
  Star,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Loader2,
  X,
} from "lucide-react";

function ToolsDashboardContent() {
  const searchParams = useSearchParams();
  const initialCat = (searchParams.get("category") as ToolCategoryId) || "all";

  const [activeCategory, setActiveCategory] = useState<ToolCategoryId | "all">(initialCat);
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const settings = getToolsSettings();
    setFavoriteIds(settings.favoriteToolIds);

    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ favoriteToolIds: string[] }>;
      if (customEvent.detail?.favoriteToolIds) {
        setFavoriteIds(customEvent.detail.favoriteToolIds);
      }
    };

    window.addEventListener("void_tools_settings_changed", handleSettingsChanged);
    return () => {
      window.removeEventListener("void_tools_settings_changed", handleSettingsChanged);
    };
  }, []);

  // Update activeCategory when query param changes
  useEffect(() => {
    const cat = searchParams.get("category") as ToolCategoryId;
    if (cat && TOOL_CATEGORIES.some((c) => c.id === cat)) {
      setActiveCategory(cat);
    }
  }, [searchParams]);

  // Filter tools based on category, search, and favorites
  const filteredTools = useMemo(() => {
    let list = toolRegistry.searchTools(searchQuery, activeCategory);

    if (favoritesOnly) {
      list = list.filter((t) => favoriteIds.includes(t.id));
    }

    return list;
  }, [searchQuery, activeCategory, favoritesOnly, favoriteIds]);

  const totalCount = toolRegistry.getTotalToolCount();

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 font-mono">
        <Link href="/settings" className="hover:text-cyan-400 transition-colors">
          Pengaturan
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
        <span className="text-[#00E5FF] font-semibold">Void Tools Hub</span>
      </nav>

      {/* Hero Banner Card */}
      <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-[#0c1427] via-[#111827] to-[#111827] border border-cyan-500/30 shadow-[0_0_40px_rgba(0,229,255,0.12)] overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 right-12 -translate-y-1/2 hidden lg:block opacity-20 pointer-events-none">
          <Cpu className="w-64 h-64 text-[#00E5FF]" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-xs font-mono text-[#00E5FF]">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>CENTRAL UTILITY HUB VOIDVERSE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Void Tools <span className="text-[#00E5FF]">Ecosystem</span>
          </h1>

          <p className="text-sm text-gray-300 leading-relaxed">
            Pusat utilitas terintegrasi untuk kecerdasan buatan, pengunduhan media manga, scraping data web, pengolahan gambar, manajemen dokumen, dan perkakas pengembang.
          </p>

          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setApiModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-[#00E5FF] text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,229,255,0.2)]"
            >
              <Key className="w-4 h-4" />
              <span>Modal Kunci API</span>
            </button>

            <Link
              href="/settings/tools/config"
              className="px-4 py-2.5 rounded-xl bg-[#080B14] hover:bg-white/5 border border-white/10 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#00E5FF]" />
              <span>Kelola Provider API</span>
            </Link>

            <Link
              href="/settings"
              className="px-4 py-2.5 rounded-xl bg-[#080B14] hover:bg-gray-800 border border-white/5 text-gray-300 text-xs font-semibold transition-all"
            >
              Kembali ke Pengaturan
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-gray-400 block font-mono">Total Utilitas</span>
            <span className="text-xl sm:text-2xl font-black text-white">{totalCount} Alat</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-mono">Kategori Utama</span>
            <span className="text-xl sm:text-2xl font-black text-[#00E5FF]">{TOOL_CATEGORIES.length} Kategori</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-mono">Eksekusi Lokal</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">Client-First</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-mono">API Eksternal</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">Expandable</span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-4">
        {/* Global Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari alat utilitas (contoh: AI Chat, Manga Downloader, Web Scraper, JSON, QR Code, PDF)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111827] text-sm text-gray-100 placeholder-gray-500 pl-11 pr-11 py-3.5 rounded-2xl border border-white/10 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 shadow-inner transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
          <button
            onClick={() => {
              setActiveCategory("all");
              setFavoritesOnly(false);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === "all" && !favoritesOnly
                ? "bg-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)] font-bold"
                : "bg-[#111827] text-gray-300 hover:text-white border border-white/5 hover:border-gray-700"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Alat ({totalCount})</span>
          </button>

          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              favoritesOnly
                ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)] font-bold"
                : "bg-[#111827] text-gray-300 hover:text-white border border-white/5 hover:border-gray-700"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnly ? "fill-black" : "text-yellow-400"}`} />
            <span>Favorit ({favoriteIds.length})</span>
          </button>

          {TOOL_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id && !favoritesOnly;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setFavoritesOnly(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)] font-bold"
                    : "bg-[#111827] text-gray-300 hover:text-white border border-white/5 hover:border-gray-700"
                }`}
              >
                <ToolIcon name={cat.iconName} className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-black/20 text-black font-extrabold" : "bg-white/5 text-gray-400"
                  }`}
                >
                  {cat.toolCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tools Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {favoritesOnly
                ? "Alat Favorit Pilihan Anda"
                : activeCategory === "all"
                ? "Seluruh Koleksi Utilitas"
                : TOOL_CATEGORIES.find((c) => c.id === activeCategory)?.name}
            </h2>
            <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/20">
              {filteredTools.length} Ditemukan
            </span>
          </div>
        </div>

        {filteredTools.length === 0 ? (
          <div className="p-16 rounded-3xl bg-[#111827] border border-white/5 text-center space-y-3">
            <Wrench className="w-12 h-12 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Tidak Ada Alat yang Cocok</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Coba gunakan kata kunci pencarian lain atau pilih kategori yang berbeda.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
                setFavoritesOnly(false);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-[#00E5FF] text-xs font-bold"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isFavorite={favoriteIds.includes(tool.id)}
                onFavoriteToggle={(id, isFav) => {
                  setFavoriteIds((prev) =>
                    isFav ? [...prev, id] : prev.filter((item) => item !== id)
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* API Configuration Modal */}
      <ApiConfigModal isOpen={apiModalOpen} onClose={() => setApiModalOpen(false)} />
    </div>
  );
}

export default function VoidToolsDashboard() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
          <p className="mt-3 text-xs font-mono text-cyan-400">MEMUAT VOID TOOLS CORE...</p>
        </div>
      }
    >
      <ToolsDashboardContent />
    </Suspense>
  );
}
