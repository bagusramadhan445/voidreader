"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { HomeData, MangaItem } from "@/lib/sources";
import { HeroBanner } from "@/components/manga/HeroBanner";
import { MangaCarousel } from "@/components/manga/MangaCarousel";
import { MangaCard } from "@/components/manga/MangaCard";
import { TopupBanner } from "@/components/ads/TopupBanner";
import { DonationCard } from "@/components/support/DonationCard";
import { normalizeImageUrl } from "@/lib/image-utils";
import { db, HistoryRecord } from "@/lib/db";
import {
  AVAILABLE_SOURCES,
  getStoredSourceId,
  getActiveSourceId,
  setActiveSourceId,
} from "@/lib/source-storage";
import {
  Flame,
  Sparkles,
  Clock,
  BookOpen,
  ArrowRight,
  Loader2,
  Compass,
  Globe,
  RefreshCw,
} from "lucide-react";

export default function HomePage() {
  const [activeSource, setActiveSource] = useState<string>(getStoredSourceId());
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSwitchingSource, setIsSwitchingSource] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<HistoryRecord | null>(null);

  // Fetch Home Data from API for specific source
  const fetchHome = useCallback(async (sourceId: string, showFullLoader = false) => {
    try {
      if (showFullLoader) {
        setLoading(true);
      } else {
        setIsSwitchingSource(true);
      }
      setError(null);

      const res = await fetch(`/api/manga/home?source=${encodeURIComponent(sourceId)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Gagal memuat data manga.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error memuat beranda.";
      setError(msg);
    } finally {
      setLoading(false);
      setIsSwitchingSource(false);
    }
  }, []);

  // Fetch Last Read from Local IndexedDB
  const fetchLastRead = useCallback(async () => {
    try {
      const latest = await db.history.orderBy("lastReadAt").reverse().first();
      if (latest) {
        setLastRead(latest);
      }
    } catch (err) {
      console.error("Error reading history from IndexedDB:", err);
    }
  }, []);

  // Initial mount: synchronize with Dexie storage and load data
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const persistedSource = await getActiveSourceId();
      if (isMounted) {
        setActiveSource(persistedSource);
        fetchHome(persistedSource, true);
      }
    }

    init();
    fetchLastRead();

    // Listen for source changes triggered from Settings or other tabs
    const handleSourceChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ sourceId: string }>;
      const newSourceId = customEvent.detail?.sourceId;
      if (
        newSourceId &&
        newSourceId !== "lunar" &&
        AVAILABLE_SOURCES.some((s) => s.id === newSourceId) &&
        newSourceId !== activeSource
      ) {
        setActiveSource(newSourceId);
        fetchHome(newSourceId, false);
      }
    };

    window.addEventListener("void_source_changed", handleSourceChanged);

    return () => {
      isMounted = false;
      window.removeEventListener("void_source_changed", handleSourceChanged);
    };
  }, [activeSource, fetchHome, fetchLastRead]);

  // Handle user switching source directly from Home page
  const handleSelectSource = async (sourceId: string) => {
    const validId = AVAILABLE_SOURCES.some((s) => s.id === sourceId && s.id !== "lunar")
      ? sourceId
      : "komiku";
    if (validId === activeSource && !error) return;
    setActiveSource(validId);
    await setActiveSourceId(validId);
    fetchHome(validId, false);
  };

  const currentSourceMeta =
    AVAILABLE_SOURCES.find((s) => s.id === activeSource) || AVAILABLE_SOURCES[0];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-16">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
          <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
        </div>
        <p className="mt-4 text-sm font-mono text-cyan-400 tracking-wider">
          MEMBUKA VOID PORTAL...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 text-center">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Terjadi Gangguan Koneksi</h2>
        <p className="text-sm text-gray-400 max-w-md mb-6">
          {error || `Tidak dapat menghubungi server ${currentSourceMeta.name} saat ini.`}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => fetchHome(activeSource, true)}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Lagi</span>
          </button>
          {activeSource !== "komiku" && (
            <button
              onClick={() => handleSelectSource("komiku")}
              className="px-6 py-2.5 rounded-xl bg-[#111827] text-white font-medium text-sm border border-cyan-500/30 hover:border-cyan-400 transition-all"
            >
              Beralih ke Komiku Indonesia
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Source Manager Switcher Pills on Home */}
        <div className="mb-6 bg-[#111827]/80 backdrop-blur-md rounded-2xl border border-white/5 p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                  Sumber Manga Aktif
                </span>
                {isSwitchingSource && (
                  <Loader2 className="w-3.5 h-3.5 text-[#00E5FF] animate-spin" />
                )}
              </div>
              <p className="text-sm font-bold text-white leading-tight">
                {currentSourceMeta.name}
              </p>
            </div>
          </div>

          {/* Quick Source Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {AVAILABLE_SOURCES.map((s) => {
              const isActive = activeSource === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSource(s.id)}
                  disabled={isSwitchingSource && isActive}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-[#00E5FF] border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.25)] font-bold"
                      : "bg-[#080B14] text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? "bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" : "bg-gray-600"
                    }`}
                  />
                  <span>{s.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-[#00E5FF] text-black font-extrabold"
                        : "bg-white/5 text-gray-400"
                    }`}
                  >
                    {s.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue Reading Pill if user has reading history */}
        {lastRead && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-[#111827] to-[#111827] border border-cyan-500/30 flex items-center justify-between gap-4 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-14 rounded-lg overflow-hidden bg-gray-800 shrink-0 border border-cyan-500/30">
                <img
                  src={normalizeImageUrl(lastRead.cover || lastRead.thumbnail)}
                  alt={lastRead.title || "Cover Manga"}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== "/placeholder.jpg") {
                      target.src = "/placeholder.jpg";
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#00E5FF] font-semibold">
                  Lanjutkan Membaca
                </span>
                <h4 className="text-sm font-bold text-white truncate">{lastRead.title}</h4>
                <p className="text-xs text-gray-400 truncate">{lastRead.lastChapterTitle}</p>
              </div>
            </div>

            <Link
              href={`/reader/${lastRead.lastChapterId}?manga=${lastRead.id}${
                lastRead.sourceId ? `&source=${lastRead.sourceId}` : ""
              }`}
              className="shrink-0 px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,229,255,0.4)]"
            >
              <span>Lanjut</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Hero Featured Banner */}
        <HeroBanner items={data.featured} />

        {/* Popular & Trending Carousel */}
        <MangaCarousel
          title="Manga Populer & Trending"
          subtitle={`Komik paling banyak dibaca di ${currentSourceMeta.name}`}
          items={data.popular}
          icon={<Flame className="w-6 h-6 text-orange-400" />}
          viewAllHref={`/explore?source=${activeSource}&sort=popular`}
        />

        {/* Latest Chapter Updates Carousel */}
        <MangaCarousel
          title="Update Chapter Terbaru"
          subtitle={`Rilis chapter terbaru dari ${currentSourceMeta.name}`}
          items={data.latest.slice(0, 15)}
          icon={<Clock className="w-6 h-6 text-[#00E5FF]" />}
          viewAllHref={`/explore?source=${activeSource}&sort=latest`}
        />

        {/* Recommendations Carousel */}
        <MangaCarousel
          title="Rekomendasi Void Reader"
          subtitle={`Koleksi pilihan terbaik dari ${currentSourceMeta.name}`}
          items={data.recommendations}
          icon={<Sparkles className="w-6 h-6 text-yellow-400" />}
          viewAllHref={`/explore?source=${activeSource}&sort=recommended`}
        />

        {/* Topup Promotion Banner */}
        <TopupBanner />

        {/* Donation Support Card */}
        <DonationCard />

        {/* Grid of Latest Releases */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Compass className="w-6 h-6 text-cyan-400" />
                Semua Rilis Terbaru
              </h2>
              <p className="text-sm text-gray-400">
                Jelajahi komik segar yang baru di-update di {currentSourceMeta.name}
              </p>
            </div>
            <Link
              href={`/explore?source=${activeSource}`}
              className="text-xs sm:text-sm font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Katalog Lengkap</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {data.latest.map((manga: MangaItem) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
