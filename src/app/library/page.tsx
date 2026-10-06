"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  db,
  BookmarkRecord,
  HistoryRecord,
  DownloadedChapterRecord,
} from "@/lib/db";
import { OfflineManager } from "@/lib/offline";
import { DonationCard } from "@/components/support/DonationCard";
import { getCurrentUser, onAuthStateChange } from "@/lib/supabase/auth";
import { syncLocalToCloud, getLastSyncTime } from "@/lib/supabase/sync";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Bookmark,
  History,
  Download,
  Trash2,
  BookOpen,
  Play,
  ArrowRight,
  Layers,
  Sparkles,
  Cloud,
  RefreshCw,
  ShieldCheck,
  LogIn,
} from "lucide-react";

type LibraryTab = "bookmarks" | "history" | "downloads";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>("bookmarks");
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [downloads, setDownloads] = useState<DownloadedChapterRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Supabase Auth & Sync status
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [b, h, d] = await Promise.all([
        db.bookmarks.orderBy("createdAt").reverse().toArray(),
        db.history.orderBy("lastReadAt").reverse().toArray(),
        OfflineManager.getAllDownloads(),
      ]);
      setBookmarks(b);
      setHistory(h);
      setDownloads(d);
    } catch (err) {
      console.error("Error loading library data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    getCurrentUser().then(setUser);
    setLastSync(getLastSyncTime());

    const { data: authSub } = onAuthStateChange((_event, _session, newUser) => {
      setUser(newUser);
    });

    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncLocalToCloud(user.id);
      if (res.success) {
        setSyncStatusMsg("Sinkronisasi Cloud berhasil!");
        setLastSync(Date.now());
      } else {
        setSyncStatusMsg(`Gagal: ${res.error}`);
      }
    } catch {
      setSyncStatusMsg("Gagal sinkronisasi.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 3000);
    }
  };

  const removeBookmark = async (id: string) => {
    await db.bookmarks.delete(id);
    setBookmarks((prev) => prev.filter((item) => item.id !== id));
  };

  const removeHistory = async (id: string) => {
    await db.history.delete(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const removeDownload = async (chapterId: string) => {
    await OfflineManager.deleteDownload(chapterId);
    setDownloads((prev) => prev.filter((item) => item.chapterId !== chapterId));
  };

  const clearCurrentTab = async () => {
    if (activeTab === "bookmarks") {
      if (confirm("Hapus semua koleksi favorit?")) {
        await db.bookmarks.clear();
        setBookmarks([]);
      }
    } else if (activeTab === "history") {
      if (confirm("Hapus semua riwayat membaca?")) {
        await db.history.clear();
        setHistory([]);
      }
    } else if (activeTab === "downloads") {
      if (confirm("Hapus semua chapter offline?")) {
        await db.downloads.clear();
        setDownloads([]);
      }
    }
  };

  return (
    <div className="min-h-screen pb-24 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Bookmark className="w-7 h-7 text-[#00E5FF]" />
              Koleksi Pribadi
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Kelola komik favorit, riwayat membaca, dan chapter offline Anda
            </p>
          </div>

          {/* Quick Clear Tab Action */}
          {((activeTab === "bookmarks" && bookmarks.length > 0) ||
            (activeTab === "history" && history.length > 0) ||
            (activeTab === "downloads" && downloads.length > 0)) && (
            <button
              onClick={clearCurrentTab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-all self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Tab Ini</span>
            </button>
          )}
        </div>

        {/* CLOUD SYNC & AUTH STATUS BANNER */}
        <div className="mb-6 p-4 rounded-2xl bg-[#111827] border border-cyan-500/20 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00E5FF] shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {user ? `Tersinkronisasi ke Akun (${user.user_metadata?.username || user.email})` : "Mode Tamu (Tersimpan Lokal)"}
                </span>
                <span className={`w-2 h-2 rounded-full ${user ? "bg-green-400 shadow-[0_0_8px_#4ade80]" : "bg-cyan-400 shadow-[0_0_8px_#00E5FF]"}`} />
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {user
                  ? lastSync
                    ? `Terakhir sinkron: ${new Date(lastSync).toLocaleTimeString()}`
                    : "Data siap disinkronkan ke Cloud Supabase"
                  : "Data tersimpan aman di IndexedDB perangkat ini. Masuk untuk sinkronisasi lintas perangkat."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            {syncStatusMsg && (
              <span className="text-xs font-mono text-[#00E5FF] px-2 py-1 rounded bg-cyan-950/60 border border-cyan-500/30">
                {syncStatusMsg}
              </span>
            )}

            {user ? (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-[#00E5FF] text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Menyinkronkan..." : "Sync Sekarang"}</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk / Sync</span>
              </Link>
            )}
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "bookmarks"
                ? "bg-[#00E5FF] text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                : "bg-[#111827] text-gray-300 hover:text-white border border-white/5"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Favorit ({bookmarks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "history"
                ? "bg-[#00E5FF] text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                : "bg-[#111827] text-gray-300 hover:text-white border border-white/5"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("downloads")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "downloads"
                ? "bg-[#00E5FF] text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                : "bg-[#111827] text-gray-300 hover:text-white border border-white/5"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduhan Offline ({downloads.length})</span>
          </button>
        </div>

        {/* TAB 1: BOOKMARKS */}
        {activeTab === "bookmarks" && (
          <div>
            {bookmarks.length === 0 ? (
              <div className="bg-[#111827] rounded-2xl border border-white/5 py-16 px-4 text-center">
                <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">
                  Belum Ada Komik Favorit
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                  Tekan tombol "Tambah ke Koleksi" pada halaman detail komik untuk menyimpannya di sini.
                </p>
                <Link
                  href="/explore"
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF] text-xs font-semibold hover:bg-cyan-500/20 transition-all"
                >
                  Jelajahi Manga Sekarang
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {bookmarks.map((item) => (
                  <div
                    key={item.id}
                    className="relative group bg-[#111827] rounded-xl overflow-hidden border border-white/5 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                  >
                    <Link href={`/manga/${item.id}`} className="block">
                      <div className="aspect-[3/4.2] w-full overflow-hidden bg-gray-900 relative">
                        <img
                          src={item.cover || item.thumbnail || "/placeholder.jpg"}
                          alt={item.title || "Cover Bookmark"}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== "/placeholder.jpg") {
                              target.src = "/placeholder.jpg";
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {item.type && (
                          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 text-cyan-300 border border-cyan-500/30 uppercase">
                            {item.type}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-[#00E5FF] transition-colors">
                          {item.title}
                        </h4>
                        {item.latestChapter && (
                          <p className="text-[11px] text-gray-400 mt-1 truncate">
                            {item.latestChapter}
                          </p>
                        )}
                      </div>
                    </Link>

                    {/* Delete bookmark button */}
                    <div className="px-3 pb-2.5 pt-0 flex justify-end">
                      <button
                        onClick={() => removeBookmark(item.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Hapus dari favorit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: READING HISTORY */}
        {activeTab === "history" && (
          <div>
            {history.length === 0 ? (
              <div className="bg-[#111827] rounded-2xl border border-white/5 py-16 px-4 text-center">
                <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">
                  Riwayat Masih Kosong
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                  Manga yang Anda baca akan otomatis tercatat di sini sehingga Anda dapat melanjutkan kapan saja.
                </p>
                <Link
                  href="/"
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF] text-xs font-semibold hover:bg-cyan-500/20 transition-all"
                >
                  Mulai Membaca
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#111827] border border-white/5 hover:border-cyan-500/30 flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-16 rounded-xl overflow-hidden bg-gray-800 shrink-0 border border-white/5">
                        <img
                          src={item.cover || item.thumbnail || "/placeholder.jpg"}
                          alt={item.title || "Cover Riwayat"}
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
                        <Link
                          href={`/manga/${item.id}`}
                          className="text-sm font-bold text-white hover:text-[#00E5FF] transition-colors truncate block"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-cyan-400 mt-0.5 font-medium truncate">
                          Terakhir: {item.lastChapterTitle}
                        </p>
                        <span className="text-[10px] text-gray-500 block mt-1">
                          Dibaca: {new Date(item.lastReadAt).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/reader/${item.lastChapterId}?manga=${item.id}`}
                        className="px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden sm:inline">Lanjutkan</span>
                      </Link>

                      <button
                        onClick={() => removeHistory(item.id)}
                        className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Hapus riwayat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOWNLOADED CHAPTERS */}
        {activeTab === "downloads" && (
          <div>
            {downloads.length === 0 ? (
              <div className="bg-[#111827] rounded-2xl border border-white/5 py-16 px-4 text-center">
                <Download className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">
                  Belum Ada Chapter Tersimpan Offline
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                  Klik tombol "Unduh" di daftar chapter manga untuk membacanya tanpa internet!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {downloads.map((item) => (
                  <div
                    key={item.chapterId}
                    className="p-4 rounded-2xl bg-[#111827] border border-cyan-500/20 flex items-center justify-between gap-4 shadow-lg shadow-cyan-950/20"
                  >
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">
                        {item.mangaTitle || "Komik Offline"}
                      </h4>
                      <p className="text-xs text-[#00E5FF] font-medium mt-0.5 truncate">
                        {item.chapterTitle}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                        <span className="font-mono">{item.pageCount} Halaman</span>
                        <span>•</span>
                        <span>
                          {new Date(item.downloadedAt).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/reader/${item.chapterId}?manga=${item.mangaId}`}
                        className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs flex items-center gap-1.5 hover:bg-cyan-400 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Baca Offline</span>
                      </Link>

                      <button
                        onClick={() => removeDownload(item.chapterId)}
                        className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Hapus download offline"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Donation Support Card */}
        <DonationCard className="mt-8" />
      </div>
    </div>
  );
}
