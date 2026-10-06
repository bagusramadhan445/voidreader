"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChapterPages, Chapter, parseChapterNumber } from "@/lib/sources";
import { db } from "@/lib/db";
import { OfflineManager } from "@/lib/offline";
import { TopupBanner } from "@/components/ads/TopupBanner";
import { DonationCard } from "@/components/support/DonationCard";
import { ChapterCommentSection } from "@/components/comments/ChapterCommentSection";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Sliders,
  RotateCcw,
  BookOpen,
  WifiOff,
  CheckCircle2,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";

type ReaderMode = "vertical" | "paged";
type ReaderWidth = "narrow" | "normal" | "wide";
type ReaderBg = "black" | "dark" | "sepia";
type ReaderSpacing = "small" | "medium" | "large";

function ReaderPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const chapterSlug = (params?.chapterSlug as string) || "";
  const mangaId = searchParams.get("manga") || "";
  const sourceParam = searchParams.get("source") || "";

  // Data states
  const [data, setData] = useState<ChapterPages | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Manga chapter list for reliable Prev / Next navigation
  const [chaptersList, setChaptersList] = useState<Chapter[]>([]);

  // Reader UI states
  const [showHUD, setShowHUD] = useState(true);
  const [mode, setMode] = useState<ReaderMode>("vertical");
  const [widthMode, setWidthMode] = useState<ReaderWidth>("normal");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Customization preferences
  const [readerBg, setReaderBg] = useState<ReaderBg>("black");
  const [readerSpacing, setReaderSpacing] = useState<ReaderSpacing>("small");
  const [brightness, setBrightness] = useState<number>(100); // 50 to 100%
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100, 125, 150%
  const [autoHideHUD, setAutoHideHUD] = useState<boolean>(true);
  const [autoNextChapter, setAutoNextChapter] = useState<boolean>(false);

  // Advanced features: HD quality
  const [isHD, setIsHD] = useState(true);
  const [qualityNotice, setQualityNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Effective manga ID: query param > chapterData mangaId > derived slug
  const effectiveMangaId =
    mangaId ||
    data?.mangaId ||
    chapterSlug.replace(/-chapter-[\d.-]+.*$/i, "");

  // 1. Fetch Chapter Data (Online or Offline IndexedDB)
  useEffect(() => {
    if (!chapterSlug) return;

    async function loadChapter() {
      try {
        setLoading(true);
        setError(null);

        // Check if chapter is saved offline first
        const offlineRecord = await OfflineManager.getDownloadedChapter(chapterSlug);
        if (offlineRecord && offlineRecord.pages.length > 0) {
          setIsOffline(true);
          setData({
            chapterId: offlineRecord.chapterId,
            mangaId: offlineRecord.mangaId,
            title: offlineRecord.chapterTitle,
            pages: offlineRecord.pages,
            sourceId: "offline",
          });
          setPages(offlineRecord.pages);
          setLoading(false);
          return;
        }

        // Otherwise, fetch from API
        const fetchUrl = sourceParam
          ? `/api/manga/chapter/${chapterSlug}?source=${sourceParam}`
          : `/api/manga/chapter/${chapterSlug}`;
        const res = await fetch(fetchUrl);
        const json = await res.json();

        if (json.success && json.data) {
          setData(json.data);
          setPages(json.data.pages);
          if (json.data.sourceId === "webtoon" || chapterSlug.startsWith("webtoon")) {
            setMode("vertical");
          }
        } else {
          setError(json.error || "Gagal memuat halaman chapter.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error memuat chapter.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadChapter();
  }, [chapterSlug, sourceParam]);

  // 2. Fetch full chapter list from manga detail for true chapter order
  useEffect(() => {
    if (!effectiveMangaId) return;

    let isMounted = true;
    async function loadMangaChapters() {
      try {
        const currentSrc = sourceParam || data?.sourceId;
        const mangaUrl = currentSrc
          ? `/api/manga/${effectiveMangaId}?source=${currentSrc}`
          : `/api/manga/${effectiveMangaId}`;
        const res = await fetch(mangaUrl);
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data?.chapters)) {
          setChaptersList(json.data.chapters);
        }
      } catch (err) {
        console.warn("[Reader] Gagal memuat daftar chapter manga:", err);
      }
    }

    loadMangaChapters();
    return () => {
      isMounted = false;
    };
  }, [effectiveMangaId, sourceParam, data?.sourceId]);

  // Compute Prev & Next Chapter based on official manga chapters order
  // PREV CHAPTER = open older chapter number (e.g. Chapter 9 from Chapter 10)
  // NEXT CHAPTER = open newer chapter number (e.g. Chapter 11 from Chapter 10)
  const { prevChapter, nextChapter } = React.useMemo(() => {
    const normCurrentSlug = chapterSlug.toLowerCase().trim().replace(/\/+$/, "");
    const currentIndex = chaptersList.findIndex(
      (ch) => ch.id.toLowerCase().trim().replace(/\/+$/, "") === normCurrentSlug
    );

    let prev: Chapter | null = null;
    let next: Chapter | null = null;

    const getNum = (chOrId: Chapter | string | null | undefined): number | null => {
      return parseChapterNumber(chOrId);
    };

    if (currentIndex !== -1) {
      // Determine if chaptersList is descending (newest first, standard in Komiku) or ascending
      let isDescending = true; // default in Komiku: index 0 is newest (Ch 10), index last is oldest (Ch 1)
      if (chaptersList.length >= 2) {
        const firstNum = getNum(chaptersList[0]);
        const lastNum = getNum(chaptersList[chaptersList.length - 1]);
        if (firstNum !== null && lastNum !== null && firstNum < lastNum) {
          isDescending = false; // index 0 is oldest
        }
      }

      if (isDescending) {
        // Descending order: [Ch 10 (idx 0), Ch 9 (idx 1), Ch 8 (idx 2)]
        // At Ch 10: Prev = Ch 9 (idx + 1), Next = none (idx - 1 < 0)
        // At Ch 9:  Prev = Ch 8 (idx + 1), Next = Ch 10 (idx - 1)
        if (currentIndex < chaptersList.length - 1) {
          prev = chaptersList[currentIndex + 1]; // Older chapter number (Prev)
        }
        if (currentIndex > 0) {
          next = chaptersList[currentIndex - 1]; // Newer chapter number (Next)
        }
      } else {
        // Ascending order: [Ch 8 (idx 0), Ch 9 (idx 1), Ch 10 (idx 2)]
        // At Ch 9: Prev = Ch 8 (idx - 1), Next = Ch 10 (idx + 1)
        if (currentIndex > 0) {
          prev = chaptersList[currentIndex - 1]; // Older chapter number (Prev)
        }
        if (currentIndex < chaptersList.length - 1) {
          next = chaptersList[currentIndex + 1]; // Newer chapter number (Next)
        }
      }
    } else {
      // Fallback to parsed chapter data if chaptersList is empty or not yet matched
      if (data?.prevChapterId) {
        prev = { id: data.prevChapterId, title: "Chapter Sebelumnya" };
      }
      if (data?.nextChapterId) {
        next = { id: data.nextChapterId, title: "Chapter Selanjutnya" };
      }
    }

    // Safety check: ensure prev chapter is strictly older (smaller number) than next chapter
    if (prev && next) {
      const pNum = getNum(prev);
      const nNum = getNum(next);
      if (pNum !== null && nNum !== null && pNum > nNum) {
        const tmp = prev;
        prev = next;
        next = tmp;
      }
    } else {
      const currentNum = getNum(chapterSlug);
      if (currentNum !== null) {
        if (prev && !next) {
          const pNum = getNum(prev);
          if (pNum !== null && pNum > currentNum) {
            next = prev;
            prev = null;
          }
        } else if (next && !prev) {
          const nNum = getNum(next);
          if (nNum !== null && nNum < currentNum) {
            prev = next;
            next = null;
          }
        }
      }
    }

    return { prevChapter: prev, nextChapter: next };
  }, [chapterSlug, chaptersList, data?.prevChapterId, data?.nextChapterId]);

  // Determine chapter number for comment header
  const currentChapterNumber = React.useMemo(() => {
    const fromTitle = parseChapterNumber(data?.title);
    if (fromTitle !== null) return fromTitle;
    return parseChapterNumber(chapterSlug);
  }, [data?.title, chapterSlug]);

  // Comment section is shown when reaching the last page of chapter
  const isLastPageReached = mode === "vertical" || currentPageIndex === pages.length - 1;

  // Source query parameter for keeping source active during chapter transitions
  const sourceQueryParam =
    sourceParam || data?.sourceId ? `&source=${sourceParam || data?.sourceId}` : "";

  // Navigation callbacks
  const navigateToPrev = useCallback(() => {
    if (prevChapter) {
      router.push(`/reader/${prevChapter.id}?manga=${effectiveMangaId}${sourceQueryParam}`);
    }
  }, [prevChapter, effectiveMangaId, router, sourceQueryParam]);

  const navigateToNext = useCallback(() => {
    if (nextChapter) {
      router.push(`/reader/${nextChapter.id}?manga=${effectiveMangaId}${sourceQueryParam}`);
    }
  }, [nextChapter, effectiveMangaId, router, sourceQueryParam]);

  // 3. Save reading progress & history to IndexedDB
  const saveProgress = useCallback(
    async (pageIdx: number, scrollPct: number) => {
      if (!chapterSlug || !data) return;
      try {
        await db.readingProgress.put({
          chapterId: chapterSlug,
          mangaId: effectiveMangaId || undefined,
          pageIndex: pageIdx,
          scrollPercent: scrollPct,
          updatedAt: Date.now(),
        });

        if (effectiveMangaId) {
          const existingHistory = await db.history.get(effectiveMangaId);
          await db.history.put({
            id: effectiveMangaId,
            title: existingHistory?.title || data.title,
            thumbnail: existingHistory?.thumbnail || "/placeholder.jpg",
            lastChapterId: chapterSlug,
            lastChapterTitle: data.title,
            lastReadAt: Date.now(),
            sourceId: data.sourceId,
          });
        }
      } catch (e) {
        console.error("Error saving progress to IndexedDB:", e);
      }
    },
    [chapterSlug, data, effectiveMangaId]
  );

  // Helper to persist reader preferences to IndexedDB
  const saveReaderPrefs = useCallback(
    async (patch: {
      readingMode?: ReaderMode;
      readerBg?: ReaderBg;
      readerSpacing?: ReaderSpacing;
      readerBrightness?: number;
      zoomLevel?: number;
      autoHideHUD?: boolean;
      autoNextChapter?: boolean;
    }) => {
      try {
        const existing = await db.userSettings.get("current");
        await db.userSettings.put({
          id: "current",
          theme: existing?.theme || "dark",
          imageQuality: existing?.imageQuality || "hd",
          readingMode: patch.readingMode || existing?.readingMode || mode,
          autoLoadNextPage: existing?.autoLoadNextPage ?? true,
          fullscreenMode: existing?.fullscreenMode ?? false,
          showReadingProgress: existing?.showReadingProgress ?? true,
          smoothAnimations: existing?.smoothAnimations ?? true,
          readerBg: patch.readerBg || existing?.readerBg || readerBg,
          readerSpacing: patch.readerSpacing || existing?.readerSpacing || readerSpacing,
          readerBrightness: patch.readerBrightness ?? existing?.readerBrightness ?? brightness,
          zoomLevel: patch.zoomLevel ?? existing?.zoomLevel ?? zoomLevel,
          autoHideHUD: patch.autoHideHUD ?? existing?.autoHideHUD ?? autoHideHUD,
          autoNextChapter: patch.autoNextChapter ?? existing?.autoNextChapter ?? autoNextChapter,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.error("Error saving reader settings to IndexedDB:", err);
      }
    },
    [mode, readerBg, readerSpacing, brightness, zoomLevel, autoHideHUD, autoNextChapter]
  );

  // 3. Scroll tracking for vertical mode
  // Load initial reader settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const isWebtoon =
          chapterSlug.startsWith("webtoon") ||
          sourceParam === "webtoon" ||
          data?.sourceId === "webtoon";

        const s = await db.userSettings.get("current");
        if (isWebtoon) {
          setMode("vertical");
        } else if (s?.readingMode) {
          setMode(s.readingMode);
        }

        if (s?.imageQuality) {
          setIsHD(s.imageQuality === "hd");
        }

        if (s?.readerBg) {
          setReaderBg(s.readerBg);
        }

        if (s?.readerSpacing) {
          setReaderSpacing(s.readerSpacing);
        }

        if (typeof s?.readerBrightness === "number") {
          setBrightness(s.readerBrightness);
        }

        if (typeof s?.zoomLevel === "number") {
          setZoomLevel(s.zoomLevel);
        }

        if (typeof s?.autoHideHUD === "boolean") {
          setAutoHideHUD(s.autoHideHUD);
        }

        if (typeof s?.autoNextChapter === "boolean") {
          setAutoNextChapter(s.autoNextChapter);
        }
      } catch (err) {
        console.error("Error loading reader settings:", err);
      }
    }
    loadSettings();
  }, [chapterSlug, sourceParam, data?.sourceId]);

  // 3-second auto-hide timer for HUD
  const resetAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    if (autoHideHUD) {
      autoHideTimerRef.current = setTimeout(() => {
        setShowHUD(false);
      }, 3000);
    }
  }, [autoHideHUD]);

  useEffect(() => {
    if (showHUD) {
      resetAutoHideTimer();
    } else {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    }
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [showHUD, resetAutoHideTimer]);

  // HD quality toggle
  const toggleHD = () => {
    setIsHD((prev) => {
      const next = !prev;
      setQualityNotice(next ? "Kualitas HD: Gambar Asli Diaktifkan" : "Kualitas Hemat: Gambar Dioptimalkan");
      setTimeout(() => setQualityNotice(null), 2500);
      return next;
    });
    resetAutoHideTimer();
  };

  // Toggle Reader HUD on user click/tap
  const toggleHUD = useCallback((e?: React.MouseEvent) => {
    if (e) {
      // Prevent double trigger when event bubbles from image wrapper to container
      if ((e as unknown as { _tapHandled?: boolean })._tapHandled) return;
      (e as unknown as { _tapHandled?: boolean })._tapHandled = true;

      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "button, a, input, select, textarea, [data-no-tap='true'], header, footer"
        )
      ) {
        return;
      }
    }

    setShowHUD((prev) => {
      const next = !prev;
      if (next) resetAutoHideTimer();
      else if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      return next;
    });
  }, [resetAutoHideTimer]);

  // 3. Scroll tracking for vertical mode
  useEffect(() => {
    if (mode !== "vertical") return;

    let lastScrollTop = 0;
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      setScrollProgress(progress);

      // Auto-hide HUD on downward scroll
      if (scrollTop > lastScrollTop && scrollTop > 150) {
        setShowHUD(false);
      }
      lastScrollTop = scrollTop;

      // Track current visible page
      pageRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
          setCurrentPageIndex(index);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mode]);

  // Auto-save on page index change
  useEffect(() => {
    saveProgress(currentPageIndex, scrollProgress);
  }, [currentPageIndex, scrollProgress, saveProgress]);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (mode === "paged" && currentPageIndex > 0) {
          setCurrentPageIndex((prev) => prev - 1);
        } else {
          navigateToPrev();
        }
      } else if (e.key === "ArrowRight") {
        if (mode === "paged" && currentPageIndex < pages.length - 1) {
          setCurrentPageIndex((prev) => prev + 1);
        } else {
          navigateToNext();
        }
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "m") {
        setShowHUD((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, currentPageIndex, pages.length, navigateToPrev, navigateToNext]);

  // Container width classes
  const getContainerWidth = () => {
    switch (widthMode) {
      case "narrow":
        return "max-w-2xl"; // ~672px
      case "wide":
        return "max-w-6xl"; // ~1152px
      case "normal":
      default:
        return "max-w-4xl"; // ~896px
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B14] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin" />
        <p className="mt-4 text-xs font-mono text-cyan-400 tracking-wider">
          MEMUAT HALAMAN CHAPTER...
        </p>
      </div>
    );
  }

  if (error || !data || pages.length === 0) {
    return (
      <div className="min-h-screen bg-[#080B14] flex flex-col items-center justify-center px-4 text-center">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Gagal Membuka Chapter</h2>
        <p className="text-sm text-gray-400 max-w-md mb-6">
          {error || "Tidak ada gambar yang dapat ditampilkan untuk chapter ini."}
        </p>
        <button
          onClick={() => (mangaId ? router.push(`/manga/${mangaId}`) : router.back())}
          className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-all"
        >
          Kembali ke Detail
        </button>
      </div>
    );
  }

  const bgThemeClasses =
    readerBg === "sepia"
      ? "bg-[#FBF0D9] text-[#2D241E]"
      : readerBg === "dark"
      ? "bg-[#18181B] text-gray-100"
      : "bg-[#080B14] text-gray-100";

  const imageBgClass =
    readerBg === "sepia" ? "bg-[#FBF0D9]" : readerBg === "dark" ? "bg-[#18181B]" : "bg-[#080B14]";

  const spacingClass =
    readerSpacing === "medium" ? "gap-2" : readerSpacing === "large" ? "gap-4" : "gap-0";

  return (
    <div
      ref={containerRef}
      onClick={toggleHUD}
      className={`min-h-screen ${bgThemeClasses} select-none relative transition-colors duration-300`}
    >
      {/* Schema.org ComicIssue Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ComicIssue",
            name: data.title,
            headline: `${data.title} Bahasa Indonesia`,
            isPartOf: {
              "@type": "ComicSeries",
              name: effectiveMangaId,
            },
            numberOfPages: pages.length,
            inLanguage: "id-ID",
          }),
        }}
      />

      {/* FLOATING QUALITY TOAST */}
      <AnimatePresence>
        {qualityNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#111827]/95 border border-cyan-500/50 text-[#00E5FF] text-xs font-mono font-semibold shadow-[0_0_20px_rgba(0,229,255,0.3)] backdrop-blur-md pointer-events-none"
          >
            {qualityNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP FLOATING HUD HEADER */}
      <header
        data-no-tap="true"
        className={`fixed top-0 left-0 right-0 z-30 transition-transform duration-300 pointer-events-none ${
          showHUD ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="bg-[#080B14]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 py-3 pointer-events-auto shadow-xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            {/* Back Button & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => (mangaId ? router.push(`/manga/${mangaId}`) : router.back())}
                className="p-2 rounded-xl bg-[#111827] text-gray-300 hover:text-[#00E5FF] hover:border-cyan-500/40 border border-white/5 transition-all"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white truncate">{data.title}</h1>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  {isOffline ? (
                    <span className="flex items-center gap-1 text-[#00E5FF]">
                      <WifiOff className="w-3 h-3" /> Mode Offline
                    </span>
                  ) : (
                    <span>Online</span>
                  )}
                  <span>•</span>
                  <span>
                    Hal {currentPageIndex + 1} dari {pages.length}
                  </span>
                  <span>•</span>
                  <span className={`font-mono ${isHD ? "text-[#00E5FF]" : "text-amber-400"}`}>
                    {isHD ? "HD 1080p" : "Hemat Data"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl border text-sm transition-all ${
                  showSettings
                    ? "bg-cyan-500/20 border-cyan-500/50 text-[#00E5FF]"
                    : "bg-[#111827] border-white/5 text-gray-300 hover:text-white"
                }`}
                title="Pengaturan Tampilan"
              >
                <Sliders className="w-4 h-4" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-[#111827] border border-white/5 text-gray-300 hover:text-white transition-all hidden sm:flex"
                title="Fullscreen (F)"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4 text-[#00E5FF]" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SETTINGS POPUP MENU */}
        {showSettings && (
          <div className="bg-[#111827]/98 backdrop-blur-xl border-b border-cyan-500/20 p-4 sm:p-6 pointer-events-auto shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Reading Mode */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-300">Mode Baca:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setMode("vertical");
                      saveReaderPrefs({ readingMode: "vertical" });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      mode === "vertical"
                        ? "bg-[#00E5FF] text-black font-bold border-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                        : "bg-[#080B14] border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    Vertical Scroll (Webtoon)
                  </button>
                  <button
                    onClick={() => {
                      setMode("paged");
                      saveReaderPrefs({ readingMode: "paged" });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      mode === "paged"
                        ? "bg-[#00E5FF] text-black font-bold border-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                        : "bg-[#080B14] border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    Single Page
                  </button>
                </div>
              </div>

              {/* Background Theme */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-300">Tema Latar Belakang:</span>
                <div className="flex items-center gap-2">
                  {[
                    { id: "black", label: "Void Black", hex: "#080B14" },
                    { id: "dark", label: "Dark Gray", hex: "#18181B" },
                    { id: "sepia", label: "Sepia", hex: "#FBF0D9" },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setReaderBg(theme.id as ReaderBg);
                        saveReaderPrefs({ readerBg: theme.id as ReaderBg });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        readerBg === theme.id
                          ? "bg-cyan-500/20 text-[#00E5FF] border-cyan-500 font-bold shadow-[0_0_10px_rgba(0,229,255,0.25)]"
                          : "bg-[#080B14] border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: theme.hex }}
                      />
                      <span>{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spacing Between Pages */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-300">Jarak Antar Halaman:</span>
                <div className="flex gap-2">
                  {[
                    { id: "small", label: "Small (0px)" },
                    { id: "medium", label: "Medium (8px)" },
                    { id: "large", label: "Large (16px)" },
                  ].map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => {
                        setReaderSpacing(sp.id as ReaderSpacing);
                        saveReaderPrefs({ readerSpacing: sp.id as ReaderSpacing });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        readerSpacing === sp.id
                          ? "bg-[#00E5FF] text-black font-bold border-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                          : "bg-[#080B14] border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brightness Slider */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-xs font-semibold text-gray-300">Kecerahan Gambar:</span>
                  <span className="text-xs font-mono text-[#00E5FF]">{brightness}%</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-56">
                  <span className="text-[10px] text-gray-500 font-mono">50%</span>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={brightness}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBrightness(val);
                      saveReaderPrefs({ readerBrightness: val });
                    }}
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
                  />
                  <span className="text-[10px] text-gray-500 font-mono">100%</span>
                </div>
              </div>

              {/* Zoom Level */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-300">Skala Zoom Halaman:</span>
                <div className="flex gap-2">
                  {[100, 125, 150].map((z) => (
                    <button
                      key={z}
                      onClick={() => {
                        setZoomLevel(z);
                        saveReaderPrefs({ zoomLevel: z });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                        zoomLevel === z
                          ? "bg-[#00E5FF] text-black font-bold border-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                          : "bg-[#080B14] border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {z}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Reader Width */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-300">Lebar Tampilan:</span>
                <div className="flex gap-2">
                  {(["narrow", "normal", "wide"] as ReaderWidth[]).map((w) => (
                    <button
                      key={w}
                      onClick={() => setWidthMode(w)}
                      className={`px-3 py-1.5 rounded-xl text-xs capitalize border transition-all ${
                        widthMode === w
                          ? "bg-[#00E5FF] text-black font-bold border-[#00E5FF]"
                          : "bg-[#080B14] border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {w === "narrow" ? "Ringkas" : w === "normal" ? "Standar" : "Lebar"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles: Auto Hide HUD & Auto Next Chapter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#080B14] border border-white/5 cursor-pointer hover:border-cyan-500/30 transition-all">
                  <span className="text-xs text-gray-300">Auto-hide HUD (3 Detik)</span>
                  <input
                    type="checkbox"
                    checked={autoHideHUD}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAutoHideHUD(val);
                      saveReaderPrefs({ autoHideHUD: val });
                    }}
                    className="w-4 h-4 rounded accent-[#00E5FF] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[#080B14] border border-white/5 cursor-pointer hover:border-cyan-500/30 transition-all">
                  <span className="text-xs text-gray-300">Auto Next Chapter</span>
                  <input
                    type="checkbox"
                    checked={autoNextChapter}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAutoNextChapter(val);
                      saveReaderPrefs({ autoNextChapter: val });
                    }}
                    className="w-4 h-4 rounded accent-[#00E5FF] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* MANGA PAGES CONTAINER */}
      <main className={`mx-auto ${getContainerWidth()} relative z-20 py-16 transition-all duration-300 pointer-events-auto`}>
        {mode === "vertical" ? (
          /* VERTICAL CONTINUOUS SCROLL MODE */
          <div
            className={`flex flex-col items-center ${spacingClass} w-full pointer-events-auto transition-transform`}
            style={{
              filter: `brightness(${brightness}%)`,
              transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
              transformOrigin: "top center",
            }}
          >
            {pages.map((pageUrl, idx) => {
              const displayUrl = isHD
                ? pageUrl || "/placeholder.jpg"
                : `/api/proxy/image?url=${encodeURIComponent(pageUrl)}`;

              return (
                <div
                  key={idx}
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                  }}
                  onClick={toggleHUD}
                  className={`w-full relative min-h-[300px] flex items-center justify-center ${imageBgClass} cursor-pointer`}
                  title="Ketuk untuk kontrol reader"
                >
                  <img
                    src={displayUrl}
                    alt={`Halaman ${idx + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== "/placeholder.jpg") {
                        target.src = "/placeholder.jpg";
                      }
                    }}
                    className="w-full h-auto object-contain select-none shadow-md transition-all duration-200 pointer-events-none"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* SINGLE PAGED MODE */
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-2 pointer-events-auto">
            <div
              onClick={toggleHUD}
              className="relative w-full max-h-[90vh] flex items-center justify-center cursor-pointer transition-transform"
              style={{
                filter: `brightness(${brightness}%)`,
                transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
              }}
              title="Ketuk untuk kontrol reader"
            >
              <img
                src={
                  isHD
                    ? pages[currentPageIndex] || "/placeholder.jpg"
                    : `/api/proxy/image?url=${encodeURIComponent(pages[currentPageIndex])}`
                }
                alt={`Halaman ${currentPageIndex + 1}`}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== "/placeholder.jpg") {
                    target.src = "/placeholder.jpg";
                  }
                }}
                className="max-h-[85vh] w-auto object-contain rounded-lg shadow-2xl transition-all duration-200 pointer-events-none"
              />
            </div>

            {/* Paged mode navigation arrows */}
            <div data-no-tap="true" className="flex items-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentPageIndex === 0}
                className="px-4 py-2 rounded-xl bg-[#111827] border border-gray-800 disabled:opacity-40 text-sm flex items-center gap-1 hover:text-[#00E5FF]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>
              <span className="text-xs font-mono text-cyan-400">
                {currentPageIndex + 1} / {pages.length}
              </span>
              <button
                onClick={() => {
                  if (currentPageIndex < pages.length - 1) {
                    setCurrentPageIndex((prev) => prev + 1);
                  } else if (autoNextChapter && nextChapter) {
                    navigateToNext();
                  }
                }}
                disabled={currentPageIndex === pages.length - 1 && (!autoNextChapter || !nextChapter)}
                className="px-4 py-2 rounded-xl bg-[#111827] border border-gray-800 disabled:opacity-40 text-sm flex items-center gap-1 hover:text-[#00E5FF]"
              >
                <span>
                  {currentPageIndex === pages.length - 1 && autoNextChapter && nextChapter
                    ? "Bab Selanjutnya"
                    : "Selanjutnya"}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM END-OF-CHAPTER NAVIGATOR */}
        <div data-no-tap="true" className="mt-12 mb-20 p-6 sm:p-8 rounded-3xl bg-[#111827] border border-cyan-500/20 text-center shadow-xl pointer-events-auto">
          <CheckCircle2 className="w-10 h-10 text-[#00E5FF] mx-auto mb-2" />
          <h3 className="text-base sm:text-lg font-bold text-white mb-1">Akhir dari {data.title}</h3>
          <p className="text-xs text-gray-400 mb-6">
            Lanjut membaca bab berikutnya atau kembali ke daftar koleksi
          </p>

          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            {/* 1. PREVIOUS CHAPTER */}
            {prevChapter ? (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href={`/reader/${prevChapter.id}?manga=${effectiveMangaId}${sourceQueryParam}`}
                  className="px-5 py-2.5 rounded-xl bg-[#080B14] border border-gray-800 hover:border-cyan-500/40 text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-2 transition-all shadow-md"
                >
                  <ChevronLeft className="w-4 h-4 text-[#00E5FF]" />
                  <span>← Prev Chapter</span>
                </Link>
              </motion.div>
            ) : (
              <button
                disabled
                className="px-5 py-2.5 rounded-xl bg-[#080B14]/40 border border-white/5 text-xs font-semibold text-gray-600 flex items-center gap-2 cursor-not-allowed opacity-50"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
                <span>← Prev Chapter</span>
              </button>
            )}

            {/* 2. NEXT CHAPTER */}
            {nextChapter ? (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href={`/reader/${nextChapter.id}?manga=${effectiveMangaId}${sourceQueryParam}`}
                  className="px-6 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all"
                >
                  <span>Next Chapter →</span>
                  <ChevronRight className="w-4 h-4 text-black" />
                </Link>
              </motion.div>
            ) : (
              <button
                disabled
                className="px-6 py-2.5 rounded-xl bg-[#080B14]/40 border border-white/5 text-xs font-semibold text-gray-600 flex items-center gap-2 cursor-not-allowed opacity-50"
              >
                <span>Next Chapter →</span>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* UNIVERSAL CHAPTER COMMENTS & AFTER-CHAPTER PROMOS */}
        <div data-no-tap="true" className="max-w-3xl mx-auto px-4 pb-28 pointer-events-auto space-y-8">
          {data && isLastPageReached && (
            <ChapterCommentSection
              sourceId={data.sourceId || sourceParam || "unknown"}
              mangaId={effectiveMangaId}
              chapterId={chapterSlug}
              chapterNumber={currentChapterNumber ?? undefined}
              className="my-6"
            />
          )}

          <TopupBanner className="my-6" />
          <DonationCard className="my-6" />
        </div>
      </main>

      {/* FLOATING READER HUD BAR: [ ← Prev ] [ HD ON/OFF ] [ Next → ] */}
      <AnimatePresence>
        {showHUD && (
          <motion.div
            data-no-tap="true"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
          >
            <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-[#111827]/95 border border-cyan-500/40 shadow-[0_0_30px_rgba(0,229,255,0.3)] backdrop-blur-xl">
              {/* [ ← Prev ] */}
              {prevChapter ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href={`/reader/${prevChapter.id}?manga=${effectiveMangaId}${sourceQueryParam}`}
                    onClick={() => resetAutoHideTimer()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080B14] hover:bg-cyan-950/60 text-gray-200 hover:text-[#00E5FF] border border-white/5 hover:border-cyan-500/40 text-xs font-semibold transition-all active:scale-95"
                    title={`Chapter Sebelumnya: ${prevChapter.title}`}
                  >
                    <ChevronLeft className="w-4 h-4 text-[#00E5FF]" />
                    <span>Prev</span>
                  </Link>
                </motion.div>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080B14]/40 text-gray-600 border border-transparent text-xs font-semibold cursor-not-allowed opacity-50"
                  title="Tidak ada chapter sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>
              )}

              {/* [ HD ] Toggle Quality */}
              <button
                onClick={toggleHD}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                  isHD
                    ? "bg-cyan-500/20 text-[#00E5FF] border-cyan-500/60 shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                    : "bg-[#080B14] text-gray-400 border-white/5 hover:text-white"
                }`}
                title={isHD ? "Kualitas Gambar HD Aktif" : "Kualitas Hemat Aktif"}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isHD ? "text-[#00E5FF]" : "text-gray-400"}`} />
                <span>{isHD ? "HD ON" : "HD OFF"}</span>
              </button>

              {/* [ Next → ] */}
              {nextChapter ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href={`/reader/${nextChapter.id}?manga=${effectiveMangaId}${sourceQueryParam}`}
                    onClick={() => resetAutoHideTimer()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black text-xs font-extrabold shadow-[0_0_12px_rgba(0,229,255,0.4)] transition-all active:scale-95"
                    title={`Chapter Selanjutnya: ${nextChapter.title}`}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4 text-black" />
                  </Link>
                </motion.div>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080B14]/40 text-gray-600 border border-transparent text-xs font-semibold cursor-not-allowed opacity-50"
                  title="Tidak ada chapter selanjutnya"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM FLOATING PROGRESS BAR & QUICK NAV */}
      <footer
        data-no-tap="true"
        className={`fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 pointer-events-none ${
          showHUD ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-[#080B14]/90 backdrop-blur-md border-t border-cyan-500/20 px-4 py-2 pointer-events-auto shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            {/* Prev Chapter Button */}
            {prevChapter ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href={`/reader/${prevChapter.id}?manga=${effectiveMangaId}${sourceQueryParam}`}
                  className="p-1.5 rounded-lg bg-[#111827] text-gray-300 hover:text-[#00E5FF] transition-all flex items-center gap-1 text-xs"
                  title={`Chapter Sebelumnya: ${prevChapter.title}`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </Link>
              </motion.div>
            ) : (
              <button
                disabled
                className="p-1.5 rounded-lg bg-[#111827]/40 text-gray-600 border border-transparent flex items-center gap-1 text-xs cursor-not-allowed opacity-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>
            )}

            {/* Reading Progress Indicator */}
            <div className="flex-1 max-w-md flex items-center gap-3">
              <span className="text-xs font-mono text-cyan-400 whitespace-nowrap">
                {currentPageIndex + 1}/{pages.length}
              </span>
              <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#00E5FF] h-full rounded-full transition-all duration-150 shadow-[0_0_8px_#00E5FF]"
                  style={{
                    width: `${
                      mode === "vertical"
                        ? scrollProgress
                        : ((currentPageIndex + 1) / pages.length) * 100
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-gray-400 whitespace-nowrap">
                {scrollProgress}%
              </span>
            </div>

            {/* Next Chapter Button */}
            {nextChapter ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href={`/reader/${nextChapter.id}?manga=${effectiveMangaId}${sourceQueryParam}`}
                  className="p-1.5 rounded-lg bg-[#00E5FF] text-black font-bold hover:bg-cyan-300 transition-all flex items-center gap-1 text-xs shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                  title={`Chapter Selanjutnya: ${nextChapter.title}`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ) : (
              <button
                disabled
                className="p-1.5 rounded-lg bg-[#111827]/40 text-gray-600 border border-transparent flex items-center gap-1 text-xs cursor-not-allowed opacity-50"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function ReaderPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#080B14] flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin" />
          <p className="mt-4 text-xs font-mono text-cyan-400 tracking-wider">
            MEMUAT HALAMAN CHAPTER...
          </p>
        </div>
      }
    >
      <ReaderPageContent />
    </React.Suspense>
  );
}

