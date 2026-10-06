"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Chapter, filterAndSortChapters } from "@/lib/sources";
import { db } from "@/lib/db";
import { OfflineManager } from "@/lib/offline";
import {
  Search,
  ArrowUpDown,
  CheckCircle2,
  Download,
  Loader2,
  Check,
  BookOpen,
} from "lucide-react";

interface ChapterListProps {
  mangaId: string;
  mangaTitle: string;
  chapters: Chapter[];
  sourceId?: string;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  mangaId,
  mangaTitle,
  chapters,
  sourceId,
}) => {
  const [search, setSearch] = useState("");
  // Default to Oldest sorting (Chapter 1 first)
  const [sortDesc, setSortDesc] = useState(false);
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set());
  const [downloadedChapters, setDownloadedChapters] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);

  // Load read and downloaded status from IndexedDB
  useEffect(() => {
    async function loadStatus() {
      try {
        // Read chapters
        const progressList = await db.readingProgress.where("mangaId").equals(mangaId).toArray();
        const readSet = new Set(progressList.map((p) => p.chapterId));
        setReadChapters(readSet);

        // Downloaded chapters
        const downloads = await db.downloads.where("mangaId").equals(mangaId).toArray();
        const dlSet = new Set(downloads.map((d) => d.chapterId));
        setDownloadedChapters(dlSet);
      } catch (err) {
        console.error("Error loading chapter status:", err);
      }
    }
    loadStatus();
  }, [mangaId]);

  // Robust Numeric Filter & Sort
  const displayChapters = useMemo(() => {
    return filterAndSortChapters(chapters, search, sortDesc ? "desc" : "asc");
  }, [chapters, search, sortDesc]);

  // Handle Download Chapter
  const handleDownload = async (e: React.MouseEvent, chapter: Chapter) => {
    e.preventDefault();
    e.stopPropagation();

    if (downloadedChapters.has(chapter.id) || downloadingId) return;

    try {
      setDownloadingId(chapter.id);
      setDownloadProgress({ current: 0, total: 1 });

      // Fetch chapter images from API
      const res = await fetch(`/api/manga/chapter/${chapter.id}`);
      const data = await res.json();
      if (!data.success || !data.data?.pages?.length) {
        throw new Error("Gagal mengambil halaman gambar");
      }

      await OfflineManager.downloadChapter(
        chapter.id,
        mangaId,
        mangaTitle,
        chapter.title,
        data.data.pages,
        (current, total) => {
          setDownloadProgress({ current, total });
        }
      );

      setDownloadedChapters((prev) => new Set([...prev, chapter.id]));
    } catch (err) {
      console.error("Download failed:", err);
      alert("Gagal mengunduh chapter offline. Coba lagi.");
    } finally {
      setDownloadingId(null);
      setDownloadProgress(null);
    }
  };

  return (
    <div className="bg-[#111827] rounded-2xl border border-white/5 p-4 sm:p-6 shadow-xl">
      {/* Chapter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#00E5FF]" />
          <h2 className="text-lg font-bold text-white">Daftar Chapter</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
            {chapters.length} Bab
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Chapter Search Filter */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari chapter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#080B14] text-xs text-gray-200 placeholder-gray-500 pl-9 pr-3 py-2 rounded-xl border border-gray-800 focus:border-[#00E5FF] focus:outline-none"
            />
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortDesc(!sortDesc)}
            title="Urutkan Chapter"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#080B14] border border-gray-800 text-xs font-medium text-gray-300 hover:text-[#00E5FF] hover:border-cyan-500/30 transition-all shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortDesc ? "Terbaru" : "Terlama"}</span>
          </button>
        </div>
      </div>

      {/* Chapter Items List */}
      <div className="mt-4 divide-y divide-white/5 max-h-[600px] overflow-y-auto pr-1">
        {displayChapters.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            Tidak ada chapter yang cocok dengan pencarian "{search}".
          </div>
        ) : (
          displayChapters.map((chapter) => {
            const isRead = readChapters.has(chapter.id);
            const isDownloaded = downloadedChapters.has(chapter.id);
            const isDownloading = downloadingId === chapter.id;

            return (
              <div
                key={chapter.id}
                className="group flex items-center justify-between py-3 px-3 hover:bg-[#161F38]/60 rounded-xl transition-all"
              >
                {/* Chapter Link */}
                <Link
                  href={`/reader/${chapter.id}?manga=${mangaId}${sourceId ? `&source=${sourceId}` : ""}`}
                  className="flex items-center gap-3 flex-1 min-w-0 mr-3"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isRead ? "bg-gray-600" : "bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]"
                    }`}
                  />
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-sm font-medium truncate transition-colors ${
                        isRead
                          ? "text-gray-400 group-hover:text-gray-200"
                          : "text-gray-100 group-hover:text-[#00E5FF]"
                      }`}
                    >
                      {chapter.title}
                    </span>
                    {chapter.releaseDate && (
                      <span className="text-[11px] text-gray-500">{chapter.releaseDate}</span>
                    )}
                  </div>
                </Link>

                {/* Badges & Download Action */}
                <div className="flex items-center gap-2 shrink-0">
                  {isRead && (
                    <span
                      title="Sudah dibaca"
                      className="text-xs text-gray-500 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
                      <span className="hidden sm:inline text-[11px]">Dibaca</span>
                    </span>
                  )}

                  {/* Offline Download Button */}
                  <button
                    onClick={(e) => handleDownload(e, chapter)}
                    disabled={isDownloaded || isDownloading}
                    title={
                      isDownloaded
                        ? "Tersedia Offline"
                        : isDownloading
                        ? `Mengunduh (${downloadProgress?.current}/${downloadProgress?.total})`
                        : "Download Chapter Offline"
                    }
                    className={`p-2 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
                      isDownloaded
                        ? "bg-cyan-500/10 border-cyan-500/30 text-[#00E5FF]"
                        : isDownloading
                        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                        : "bg-[#080B14] border-gray-800 text-gray-400 hover:text-[#00E5FF] hover:border-cyan-500/30"
                    }`}
                  >
                    {isDownloaded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#00E5FF]" />
                        <span className="hidden sm:inline text-[11px]">Offline</span>
                      </>
                    ) : isDownloading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-[11px] font-mono">
                          {downloadProgress
                            ? `${downloadProgress.current}/${downloadProgress.total}`
                            : "..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Unduh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
