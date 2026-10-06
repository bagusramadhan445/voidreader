"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { UserFollowRecord, db } from "@/lib/db";
import { getFollowedList, unfollowManga } from "@/lib/follows";
import { AVAILABLE_SOURCES } from "@/lib/source-storage";
import { TopupBanner } from "@/components/ads/TopupBanner";
import {
  Heart,
  Bookmark,
  Play,
  Trash2,
  BookOpen,
  Sparkles,
  Loader2,
  Check,
  Compass,
  ArrowRight,
} from "lucide-react";

export default function FollowingPage() {
  const [follows, setFollows] = useState<UserFollowRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFollows = async () => {
    try {
      setLoading(true);
      const list = await getFollowedList();
      setFollows(list);
    } catch (err) {
      console.error("Error loading followed manga:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollows();

    const handleFollowChange = () => {
      loadFollows();
    };

    window.addEventListener("void_follow_changed", handleFollowChange);
    return () => {
      window.removeEventListener("void_follow_changed", handleFollowChange);
    };
  }, []);

  const handleUnfollow = async (sourceId: string, mangaId: string) => {
    if (confirm("Berhenti mengikuti manga ini?")) {
      await unfollowManga(sourceId, mangaId);
      setFollows((prev) =>
        prev.filter((f) => !(f.sourceId === sourceId && f.mangaId === mangaId))
      );
    }
  };

  const getSourceLabel = (sourceId: string) => {
    const s = AVAILABLE_SOURCES.find((src) => src.id === sourceId);
    return s ? s.label : sourceId;
  };

  return (
    <div className="min-h-screen pb-24 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Heart className="w-7 h-7 text-[#00E5FF] fill-[#00E5FF]" />
              Manga yang Diikuti
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Daftar komik favorit yang Anda ikuti dengan notifikasi update terbaru
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400 font-mono px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30">
              {follows.length} Judul Diikuti
            </span>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
            <p className="mt-3 text-xs font-mono text-cyan-400">MEMUAT DAFTAR FOLLOW...</p>
          </div>
        ) : follows.length === 0 ? (
          <div className="bg-[#111827] rounded-3xl border border-white/5 py-16 px-4 text-center">
            <Heart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              Belum Mengikuti Komik Apapun
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
              Tekan tombol [ + Follow ] pada halaman detail manga untuk mendapatkan kabar update chapter terbaru di sini.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Jelajahi Manga Sekarang</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {follows.map((item) => (
              <div
                key={item.id}
                className="bg-[#111827] rounded-2xl border border-white/5 hover:border-cyan-500/30 p-4 transition-all flex gap-4 group relative overflow-hidden"
              >
                {/* Cover Poster */}
                <Link
                  href={`/manga/${item.mangaId}?source=${item.sourceId}`}
                  className="w-20 sm:w-24 aspect-[3/4.2] rounded-xl overflow-hidden bg-gray-900 shrink-0 border border-white/10 group-hover:border-cyan-500/40 transition-colors"
                >
                  <img
                    src={item.cover || "/placeholder.jpg"}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== "/placeholder.jpg") {
                        target.src = "/placeholder.jpg";
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                {/* Info Column */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    {/* Source Badge */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[#00E5FF] uppercase">
                        {getSourceLabel(item.sourceId)}
                      </span>
                      <button
                        onClick={() => handleUnfollow(item.sourceId, item.mangaId)}
                        className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Berhenti Mengikuti"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title */}
                    <Link
                      href={`/manga/${item.mangaId}?source=${item.sourceId}`}
                      className="text-sm font-bold text-white hover:text-[#00E5FF] transition-colors line-clamp-1 block"
                      title={item.title}
                    >
                      {item.title}
                    </Link>

                    {/* Chapter Info */}
                    <div className="mt-2 space-y-1 text-xs">
                      {item.lastChapter && (
                        <p className="text-gray-400 truncate">
                          <span className="text-gray-500">Terakhir dibaca:</span>{" "}
                          <span className="text-cyan-400 font-mono font-medium">
                            {item.lastChapter}
                          </span>
                        </p>
                      )}

                      <p className="text-gray-300 truncate">
                        <span className="text-gray-500">Update terbaru:</span>{" "}
                        <span className="text-emerald-400 font-mono font-semibold">
                          {item.latestChapter || "Tersedia"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 font-mono">
                      Diikuti: {new Date(item.createdAt).toLocaleDateString("id-ID")}
                    </span>

                    <Link
                      href={`/manga/${item.mangaId}?source=${item.sourceId}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#00E5FF] hover:underline"
                    >
                      <span>Baca</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Topup Promo Banner */}
        <TopupBanner className="my-8" />
      </div>
    </div>
  );
}
