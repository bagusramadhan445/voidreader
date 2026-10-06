"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MangaItem } from "@/lib/sources";
import { MangaCard } from "@/components/manga/MangaCard";
import { TopupBanner } from "@/components/ads/TopupBanner";
import {
  Search,
  Filter,
  Layers,
  Sparkles,
  Loader2,
  X,
  Compass,
  Globe,
} from "lucide-react";

import {
  AVAILABLE_SOURCES,
  getStoredSourceId,
  getActiveSourceId,
  setActiveSourceId,
} from "@/lib/source-storage";

const SOURCES = AVAILABLE_SOURCES;

const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Isekai",
  "Magic",
  "Martial Arts",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Shounen",
  "Slice of Life",
  "Supernatural",
  "Thriller",
];

const TYPES = [
  { label: "Semua Tipe", value: "all" },
  { label: "Manga (JP)", value: "manga" },
  { label: "Manhwa (KR)", value: "manhwa" },
  { label: "Manhua (CN)", value: "manhua" },
  { label: "Webtoon", value: "webtoon" },
];

const STATUSES = [
  { label: "Semua Status", value: "all" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
];

const SORTS = [
  { label: "Terpopuler", value: "popular" },
  { label: "Update Terbaru", value: "latest" },
  { label: "Rating Tertinggi", value: "rating" },
];

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialGenre = searchParams.get("genre") || "";
  const rawParamSource = searchParams.get("source");
  const validParamSource =
    rawParamSource && AVAILABLE_SOURCES.some((s) => s.id === rawParamSource && s.id !== "lunar")
      ? rawParamSource
      : null;
  const initialSource = validParamSource || getStoredSourceId();

  const [query, setQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSort, setSelectedSort] = useState("popular");
  const [selectedSource, setSelectedSource] = useState(initialSource);
  const [results, setResults] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync active source and listen for external changes
  useEffect(() => {
    let isMounted = true;
    async function syncSource() {
      const active = await getActiveSourceId();
      if (isMounted) {
        if (!validParamSource && active && active !== selectedSource && AVAILABLE_SOURCES.some((s) => s.id === active)) {
          setSelectedSource(active);
        }
      }
    }
    syncSource();

    const handleSourceChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ sourceId: string }>;
      const newSourceId = customEvent.detail?.sourceId;
      if (
        newSourceId &&
        newSourceId !== "lunar" &&
        AVAILABLE_SOURCES.some((s) => s.id === newSourceId)
      ) {
        setSelectedSource(newSourceId);
      }
    };

    window.addEventListener("void_source_changed", handleSourceChanged);
    return () => {
      isMounted = false;
      window.removeEventListener("void_source_changed", handleSourceChanged);
    };
  }, [validParamSource, selectedSource]);

  const fetchResults = useCallback(
    async (
      q: string,
      genre: string,
      type: string,
      status: string,
      sort: string,
      source: string
    ) => {
      try {
        setLoading(true);
        const validSource =
          AVAILABLE_SOURCES.some((s) => s.id === source && s.id !== "lunar")
            ? source
            : "komiku";

        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (genre.trim()) params.set("genre", genre.trim());
        if (type && type !== "all") params.set("type", type);
        if (status && status !== "all") params.set("status", status);
        if (sort) params.set("sort", sort);
        params.set("source", validSource);

        const res = await fetch(`/api/manga/search?${params.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setResults(data.data);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchResults(query, selectedGenre, selectedType, selectedStatus, selectedSort, selectedSource);
  }, [selectedGenre, selectedType, selectedStatus, selectedSort, selectedSource, fetchResults]);

  const handleSelectSource = (sourceId: string) => {
    const validId = AVAILABLE_SOURCES.some((s) => s.id === sourceId && s.id !== "lunar")
      ? sourceId
      : "komiku";
    setSelectedSource(validId);
    setActiveSourceId(validId);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResults(query, selectedGenre, selectedType, selectedStatus, selectedSort, selectedSource);
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedGenre("");
    setSelectedType("all");
    setSelectedStatus("all");
    setSelectedSort("popular");
    const validSource = AVAILABLE_SOURCES.some((s) => s.id === selectedSource && s.id !== "lunar")
      ? selectedSource
      : "komiku";
    fetchResults("", "", "all", "all", "popular", validSource);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Compass className="w-7 h-7 text-[#00E5FF]" />
          Jelajahi Manga & Manhwa
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Temukan komik favorit berdasarkan genre, tipe, dan judul bahasa Indonesia
        </p>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-[#111827] rounded-2xl border border-white/5 p-4 sm:p-5 shadow-xl mb-8">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari judul komik (contoh: Solo Leveling, One Piece, Magic...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#080B14] text-sm text-gray-100 placeholder-gray-500 pl-10 pr-10 py-3 rounded-xl border border-gray-800 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-bold text-sm transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] shrink-0"
          >
            Cari
          </button>
        </form>

        {/* Source Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2.5 pt-1 border-b border-white/5 mb-3">
          <Globe className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />
          <span className="text-xs text-gray-400 mr-1 hidden sm:inline">Sumber:</span>
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectSource(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedSource === s.id
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-[#00E5FF] border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.25)] font-bold"
                  : "bg-[#080B14] text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700"
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedSource === s.id
                    ? "bg-[#00E5FF] text-black font-extrabold"
                    : "bg-white/5 text-gray-400"
                }`}
              >
                {s.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Type Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2.5 pt-1 border-b border-white/5 mb-3">
          <Layers className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />
          <span className="text-xs text-gray-400 mr-1 hidden sm:inline">Tipe:</span>
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedType(t.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedType === t.value
                  ? "bg-[#00E5FF] text-black font-bold shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                  : "bg-[#080B14] text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status & Sorting Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 pt-1 border-b border-white/5 mb-3">
          {/* Status Switcher Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Status:
            </span>
            {STATUSES.map((st) => (
              <button
                key={st.value}
                onClick={() => setSelectedStatus(st.value)}
                className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedStatus === st.value
                    ? "bg-[#00E5FF] text-black font-bold shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                    : "bg-[#080B14] text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Sort Switcher Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs text-gray-400 mr-1">Urutan:</span>
            {SORTS.map((sr) => (
              <button
                key={sr.value}
                onClick={() => setSelectedSort(sr.value)}
                className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedSort === sr.value
                    ? "bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/50 font-bold shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                    : "bg-[#080B14] text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700"
                }`}
              >
                {sr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Genre Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs text-gray-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-cyan-400" />
            Genre:
          </span>
          <button
            onClick={() => setSelectedGenre("")}
            className={`px-3 py-1 rounded-lg text-xs transition-all ${
              selectedGenre === ""
                ? "bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/40 font-semibold"
                : "bg-[#080B14] text-gray-400 hover:text-gray-200 border border-gray-800/80"
            }`}
          >
            Semua
          </button>
          {GENRES.map((g) => {
            const active = selectedGenre.toLowerCase() === g.toLowerCase();
            return (
              <button
                key={g}
                onClick={() => setSelectedGenre(active ? "" : g)}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  active
                    ? "bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/40 font-semibold shadow-[0_0_8px_rgba(0,229,255,0.2)]"
                    : "bg-[#080B14] text-gray-400 hover:text-gray-200 border border-gray-800/80 hover:border-gray-700"
                }`}
              >
                {g}
              </button>
            );
          })}

          {(query || selectedGenre || selectedType !== "all" || selectedStatus !== "all" || selectedSort !== "popular") && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-rose-400 hover:text-rose-300 underline underline-offset-2 flex items-center gap-1 py-1"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Topup Promotion Banner */}
      <TopupBanner className="my-6" />

      {/* Results Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00E5FF]" />
          <h2 className="text-base font-bold text-white">
            {query
              ? `Hasil Pencarian "${query}"`
              : selectedGenre
              ? `Genre: ${selectedGenre}`
              : "Koleksi Terpopuler"}
          </h2>
          <span className="text-xs text-cyan-400 font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30">
            {results.length} Judul
          </span>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
          <p className="mt-3 text-xs font-mono text-cyan-400">Mencari data...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-[#111827] rounded-2xl border border-white/5 py-16 px-4 text-center">
          <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            Tidak Ada Komik Ditemukan
          </h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
            Coba gunakan kata kunci lain atau pilih genre yang berbeda.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF] text-xs font-semibold hover:bg-cyan-500/20 transition-all"
          >
            Tampilkan Semua Komik
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {results.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <div className="min-h-screen pb-24 pt-20">
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
            <p className="mt-3 text-xs font-mono text-cyan-400">MEMBUAT KATALOG...</p>
          </div>
        }
      >
        <ExploreContent />
      </Suspense>
    </div>
  );
}
