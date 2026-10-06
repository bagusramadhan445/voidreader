"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MangaDetail } from "@/lib/sources";
import { ChapterList } from "@/components/manga/ChapterList";
import { CommentSection } from "@/components/comments/CommentSection";
import { MangaReviewSection } from "@/components/manga/MangaReviewSection";
import { db, HistoryRecord } from "@/lib/db";
import { isFollowing, toggleFollow } from "@/lib/follows";
import { fetchMangaReviews, MangaReviewSummary } from "@/lib/reviews";
import {
  Play,
  Bookmark,
  Share2,
  BookOpen,
  User,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  ArrowLeft,
  Heart,
  Star,
} from "lucide-react";

function MangaDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "";
  const sourceParam = searchParams.get("source") || "";

  const [detail, setDetail] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<MangaReviewSummary | null>(null);
  const [lastReadChapter, setLastReadChapter] = useState<HistoryRecord | null>(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;

    async function loadData() {
      try {
        setLoading(true);
        // 1. Fetch Manga Detail with optional source
        const fetchUrl = sourceParam
          ? `/api/manga/${slug}?source=${sourceParam}`
          : `/api/manga/${slug}`;
        const res = await fetch(fetchUrl);
        const data = await res.json();
        if (data.success && data.data) {
          setDetail(data.data);
        } else {
          setError(data.error || "Gagal memuat detail komik.");
        }

        // 2. Check Bookmark in IndexedDB
        const bookmark = await db.bookmarks.get(slug);
        setIsBookmarked(!!bookmark);

        // 3. Check Reading History for this Manga
        const historyItem = await db.history.get(slug);
        if (historyItem) {
          setLastReadChapter(historyItem);
        }

        // 4. Check Follow status & Reviews
        if (data.data?.sourceId) {
          const [following, revSummary] = await Promise.all([
            isFollowing(data.data.sourceId, slug),
            fetchMangaReviews(data.data.sourceId, slug),
          ]);
          setIsFollowed(following);
          setRatingSummary(revSummary);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error memuat data komik.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug, sourceParam]);

  // Handle Follow Toggle
  const toggleFollowManga = async () => {
    if (!detail) return;
    try {
      const latestChTitle =
        detail.chapters.length > 0
          ? detail.chapters[detail.chapters.length - 1]?.title
          : undefined;

      const nextStatus = await toggleFollow({
        sourceId: detail.sourceId,
        mangaId: detail.id,
        title: detail.title,
        cover: detail.cover || detail.thumbnail,
        lastChapter: lastReadChapter?.lastChapterTitle,
        latestChapter: latestChTitle,
      });
      setIsFollowed(nextStatus);
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  // Handle Bookmark Toggle
  const toggleBookmark = async () => {
    if (!detail) return;
    try {
      if (isBookmarked) {
        await db.bookmarks.delete(detail.id);
        setIsBookmarked(false);
      } else {
        const latestChTitle =
          detail.chapters.length > 0
            ? detail.chapters[detail.chapters.length - 1]?.title
            : undefined;

        await db.bookmarks.put({
          id: detail.id,
          title: detail.title,
          thumbnail: detail.thumbnail,
          type: detail.type,
          latestChapter: latestChTitle,
          sourceId: detail.sourceId,
          createdAt: Date.now(),
        });
        setIsBookmarked(true);
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
    }
  };

  // Handle Share
  const handleShare = async () => {
    if (!detail) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${detail.title} - Void Reader`,
          text: `Baca komik ${detail.title} Bahasa Indonesia di Void Reader`,
          url,
        });
      } catch {
        // Ignored if cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-16">
        <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
        <p className="mt-3 text-xs font-mono text-cyan-400">MEMUAT DETAIL MANGA...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Gagal Memuat Komik</h2>
        <p className="text-sm text-gray-400 mb-6">{error || "Komik tidak ditemukan."}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all"
        >
          Kembali
        </button>
      </div>
    );
  }

  // Determine starting chapter:
  // If user has history, continue that. Otherwise, start from oldest chapter (Chapter 1)
  const firstChapter =
    detail.chapters.length > 0 ? detail.chapters[0] : null;
  const targetChapter = lastReadChapter
    ? { id: lastReadChapter.lastChapterId, title: lastReadChapter.lastChapterTitle }
    : firstChapter;

  return (
    <div className="min-h-screen pb-24 pt-16">
      {/* Schema.org ComicSeries Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ComicSeries",
            name: detail.title,
            headline: `${detail.title} Bahasa Indonesia`,
            description: detail.synopsis || `Baca komik ${detail.title} Bahasa Indonesia di Void Reader`,
            image: detail.cover || detail.thumbnail,
            author: {
              "@type": "Person",
              name: detail.author || "Anonim",
            },
            genre: detail.genres,
            numberOfEpisodes: detail.chapters.length,
            inLanguage: "id-ID",
          }),
        }}
      />

      {/* Background Atmospheric Glow Backdrop */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute inset-0 h-[480px] z-0 pointer-events-none">
          <img
            src={detail.cover || detail.thumbnail || "/placeholder.jpg"}
            alt={detail.title || "Backdrop Manga"}
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== "/placeholder.jpg") {
                target.src = "/placeholder.jpg";
              }
            }}
            className="w-full h-full object-cover filter blur-3xl opacity-20 scale-125"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080B14]/80 via-[#080B14]/95 to-[#080B14]" />
        </div>

        {/* Top Breadcrumb & Back */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#00E5FF] transition-colors py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        </div>

        {/* Hero Manga Info Header */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {/* Poster Card */}
            <div className="w-48 sm:w-56 md:w-64 shrink-0 mx-auto md:mx-0">
              <div className="relative aspect-[3/4.2] rounded-2xl overflow-hidden border border-cyan-500/20 shadow-2xl shadow-cyan-950/40 bg-[#111827]">
                <img
                  src={detail.cover || detail.thumbnail || "/placeholder.jpg"}
                  alt={detail.title || "Poster Manga"}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== "/placeholder.jpg") {
                      target.src = "/placeholder.jpg";
                    }
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#080B14]/80 backdrop-blur-md border border-cyan-500/30 text-[#00E5FF] uppercase">
                    {detail.type}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Column */}
            <div className="flex-1 min-w-0">
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#00E5FF]" />
                  {detail.status}
                </span>

                {/* Rating Score Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{ratingSummary ? ratingSummary.averageRating : 4.8} / 5.0</span>
                  <span className="text-gray-400 text-[10px]">
                    ({ratingSummary && ratingSummary.totalCount > 0 ? ratingSummary.totalCount : "1,240"} Penilaian)
                  </span>
                </div>

                {detail.author && (
                  <span className="text-xs text-gray-300 px-2.5 py-0.5 rounded-full bg-[#111827] border border-white/5 flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-400" />
                    {detail.author}
                  </span>
                )}

                <span className="text-xs text-gray-400 font-mono px-2 py-0.5 rounded-full bg-white/5">
                  {detail.chapters.length} Bab
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                {detail.title}
              </h1>

              {detail.alternativeTitle && (
                <p className="text-xs sm:text-sm text-cyan-400/80 mt-1 italic">
                  {detail.alternativeTitle}
                </p>
              )}

              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 mt-3.5">
                {detail.genres.map((g) => (
                  <Link
                    key={g}
                    href={`/explore?genre=${encodeURIComponent(g)}`}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#111827] text-gray-300 hover:text-[#00E5FF] hover:border-cyan-500/40 border border-white/5 transition-all"
                  >
                    {g}
                  </Link>
                ))}
              </div>

              {/* Synopsis */}
              <div className="mt-4 bg-[#111827]/60 rounded-xl p-4 border border-white/5">
                <p
                  className={`text-sm text-gray-300 leading-relaxed ${
                    synopsisExpanded ? "" : "line-clamp-3"
                  }`}
                >
                  {detail.synopsis}
                </p>
                {detail.synopsis.length > 200 && (
                  <button
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    className="mt-2 text-xs font-semibold text-[#00E5FF] hover:underline flex items-center gap-1"
                  >
                    <span>{synopsisExpanded ? "Sembunyikan" : "Baca Selengkapnya"}</span>
                    {synopsisExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Action Buttons Bar */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {targetChapter ? (
                  <Link
                    href={`/reader/${targetChapter.id}?manga=${detail.id}${detail.sourceId ? `&source=${detail.sourceId}` : ""}`}
                    className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-[#00E5FF] text-black font-extrabold text-sm hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] hover:scale-102 active:scale-98 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {lastReadChapter
                        ? `Lanjutkan (${lastReadChapter.lastChapterTitle})`
                        : "Mulai Membaca"}
                    </span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="px-6 py-3.5 rounded-xl bg-gray-800 text-gray-400 text-sm cursor-not-allowed"
                  >
                    Belum Ada Chapter
                  </button>
                )}

                {/* Follow Manga Toggle Button */}
                <button
                  onClick={toggleFollowManga}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-xl border text-sm font-bold transition-all ${
                    isFollowed
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.25)]"
                      : "bg-[#111827] border-white/10 hover:border-cyan-500/40 text-gray-200 hover:text-white"
                  }`}
                  title={isFollowed ? "Sedang Mengikuti" : "Ikuti Manga"}
                >
                  {isFollowed ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>✓ Following</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 text-[#00E5FF]" />
                      <span>+ Follow</span>
                    </>
                  )}
                </button>

                {/* Bookmark Toggle */}
                <button
                  onClick={toggleBookmark}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                    isBookmarked
                      ? "bg-cyan-500/20 border-cyan-500/50 text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.25)]"
                      : "bg-[#111827] border-white/10 hover:border-cyan-500/40 text-gray-200 hover:text-white"
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 ${isBookmarked ? "fill-current text-[#00E5FF]" : ""}`}
                  />
                  <span>{isBookmarked ? "Tersimpan di Koleksi" : "Tambah ke Koleksi"}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-[#111827] hover:bg-[#161F38] border border-white/10 hover:border-cyan-500/40 text-gray-200 hover:text-white text-sm font-medium transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#00E5FF]" />
                      <span className="text-[#00E5FF]">Link Disalin</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-cyan-400" />
                      <span>Bagikan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <ChapterList
          mangaId={detail.id}
          mangaTitle={detail.title}
          chapters={detail.chapters}
          sourceId={detail.sourceId}
        />

        {/* Manga Rating & Review Section */}
        <MangaReviewSection
          sourceId={detail.sourceId}
          mangaId={detail.id}
          mangaTitle={detail.title}
        />

        {/* Reader Comments Community Section */}
        <CommentSection mangaId={detail.id} mangaTitle={detail.title} />
      </div>
    </div>
  );
}

export default function MangaDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080B14] flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin" />
          <p className="mt-4 text-xs font-mono text-cyan-400 tracking-wider">
            MEMUAT DETAIL MANGA...
          </p>
        </div>
      }
    >
      <MangaDetailContent />
    </Suspense>
  );
}
