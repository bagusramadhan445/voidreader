"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/router";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { db, UserSettingsRecord } from "@/lib/db";
import { getCurrentUser, signOut, onAuthStateChange } from "@/lib/supabase/auth";
import { syncLocalToCloud, restoreCloudToLocal, getLastSyncTime } from "@/lib/supabase/sync";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { TopupBanner } from "@/components/ads/TopupBanner";
import { DonationCard } from "@/components/support/DonationCard";
import { setActiveSourceId } from "@/lib/source-storage";
import {
  Settings,
  BookOpen,
  Palette,
  Database,
  Server,
  Heart,
  Cloud,
  User,
  LogIn,
  LogOut,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  Sliders,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

export default function SettingsPage() {
  const router = useRouter();

  // Settings states
  const [readingMode, setReadingMode] = useState<"vertical" | "paged">("vertical");
  const [imageQuality, setImageQuality] = useState<"hd" | "medium" | "low">("hd");
  const [readingDirection, setReadingDirection] = useState<"ltr" | "rtl" | "vertical">("vertical");
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<number>(2);

  // Appearance states
  const [readerFontSize, setReaderFontSize] = useState<"sm" | "md" | "lg">("md");

  // Storage states
  const [dbStats, setDbStats] = useState({ bookmarks: 0, history: 0, downloads: 0 });
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);

  // Sources
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [defaultSource, setDefaultSource] = useState<string>("komiku");

  // Auth & Cloud Sync
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load initial stats & settings
  useEffect(() => {
    async function loadData() {
      try {
        const [resSources, bCount, hCount, dCount, userSettings, currentUser] = await Promise.all([
          fetch("/api/sources")
            .then((r) => r.json())
            .catch(() => ({ success: false, sources: [] })),
          db.bookmarks.count(),
          db.history.count(),
          db.downloads.count(),
          db.userSettings.get("current"),
          getCurrentUser(),
        ]);

        if (resSources.success && resSources.sources) {
          setSources(resSources.sources);
        }
        setDbStats({ bookmarks: bCount, history: hCount, downloads: dCount });

        if (userSettings) {
          if (userSettings.readingMode) setReadingMode(userSettings.readingMode);
          if (userSettings.imageQuality) setImageQuality(userSettings.imageQuality);
          if (userSettings.defaultSource && userSettings.defaultSource !== "lunar") {
            setDefaultSource(userSettings.defaultSource);
          } else {
            setDefaultSource("komiku");
            persistSettings({ defaultSource: "komiku" });
          }
        } else {
          const savedSource = localStorage.getItem("void_reader_default_source");
          if (savedSource && savedSource !== "lunar") {
            setDefaultSource(savedSource);
          } else {
            setDefaultSource("komiku");
            localStorage.setItem("void_reader_default_source", "komiku");
          }
        }

        setUser(currentUser);
        setLastSync(getLastSyncTime());
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    }

    loadData();

    // Listen for auth state changes
    const { data: authSub } = onAuthStateChange((_event, _session, newUser) => {
      setUser(newUser);
    });

    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  // Save changes to Dexie
  const persistSettings = async (updates: Partial<UserSettingsRecord>) => {
    try {
      const existing = (await db.userSettings.get("current")) || {
        id: "current",
        theme: "dark",
        imageQuality: "hd",
        readingMode: "vertical",
        autoLoadNextPage: true,
        fullscreenMode: false,
        showReadingProgress: true,
        smoothAnimations: true,
        defaultSource: "komiku",
        updatedAt: Date.now(),
      };

      const updated = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };

      await db.userSettings.put(updated as UserSettingsRecord);
    } catch (err) {
      console.error("Failed to save user settings:", err);
    }
  };

  // Handlers for storage
  const handleClearCache = () => {
    setCacheStatus("Membersihkan cache gambar...");
    setTimeout(() => {
      setCacheStatus("Cache gambar lokal berhasil dibersihkan!");
      setTimeout(() => setCacheStatus(null), 3000);
    }, 700);
  };

  const handleExportBookmarks = async () => {
    try {
      const bookmarks = await db.bookmarks.toArray();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(bookmarks, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `void-reader-bookmarks-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("Gagal mengunduh file bookmark JSON.");
    }
  };

  const handleImportBookmarks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            await db.bookmarks.bulkPut(parsed);
            const count = await db.bookmarks.count();
            setDbStats((prev) => ({ ...prev, bookmarks: count }));
            setCacheStatus(`Berhasil mengimpor ${parsed.length} bookmark!`);
            setTimeout(() => setCacheStatus(null), 3000);
          } else {
            alert("Format JSON tidak valid.");
          }
        } catch {
          alert("Gagal membaca file JSON.");
        }
      };
    }
  };

  const handleClearAllStorage = async () => {
    if (confirm("Peringatan: Apakah Anda yakin ingin mereset seluruh data lokal (bookmark, riwayat, offline)? Tindakan ini tidak dapat dibatalkan.")) {
      await Promise.all([
        db.bookmarks.clear(),
        db.history.clear(),
        db.downloads.clear(),
        db.readingProgress.clear(),
      ]);
      setDbStats({ bookmarks: 0, history: 0, downloads: 0 });
      setCacheStatus("Semua data lokal berhasil direset.");
      setTimeout(() => setCacheStatus(null), 3000);
    }
  };

  // Handlers for Cloud Sync
  const handleSyncToCloud = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const res = await syncLocalToCloud(user.id);
      if (res.success) {
        setSyncMessage("Koleksi & riwayat berhasil disinkronkan ke Cloud!");
        setLastSync(Date.now());
      } else {
        setSyncMessage(`Gagal sinkronisasi: ${res.error || "Terjadi kesalahan"}`);
      }
    } catch (err: unknown) {
      setSyncMessage(err instanceof Error ? err.message : "Gagal sinkronisasi.");
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const res = await restoreCloudToLocal(user.id);
      if (res.success) {
        const [bCount, hCount] = await Promise.all([db.bookmarks.count(), db.history.count()]);
        setDbStats((prev) => ({ ...prev, bookmarks: bCount, history: hCount }));
        setSyncMessage("Data Cloud berhasil dipulihkan ke perangkat ini!");
        setLastSync(Date.now());
      } else {
        setSyncMessage(`Gagal restore: ${res.error || "Terjadi kesalahan"}`);
      }
    } catch (err: unknown) {
      setSyncMessage(err instanceof Error ? err.message : "Gagal memulihkan data.");
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const handleLogout = async () => {
    if (confirm("Apakah Anda ingin keluar dari akun? Data lokal Anda akan tetap tersimpan di perangkat ini.")) {
      await signOut();
      setUser(null);
    }
  };

  return (
    <div className="min-h-screen pb-28 pt-20 bg-[#080B14]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-[#00E5FF]" />
            Pengaturan & Ekosistem
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Sesuaikan pengalaman membaca, sumber manga, penyimpanan lokal, dan sinkronisasi Cloud.
          </p>
        </div>

        {/* Status Alert Toast */}
        {cacheStatus && (
          <div className="p-4 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-[#00E5FF] text-sm flex items-center gap-2.5 shadow-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{cacheStatus}</span>
          </div>
        )}

        {/* 1. PENGATURAN MEMBACA */}
        <section className="bg-[#111827] rounded-3xl border border-white/5 p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">1. Pengaturan Membaca</h2>
              <p className="text-xs text-gray-400">Kontrol tata letak dan perilaku reader</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Mode Baca */}
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">Mode Baca</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setReadingMode("vertical");
                    persistSettings({ readingMode: "vertical" });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    readingMode === "vertical"
                      ? "bg-[#00E5FF] text-black border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                      : "bg-[#111827] text-gray-400 border-white/5 hover:text-white"
                  }`}
                >
                  Vertical Scroll
                </button>
                <button
                  onClick={() => {
                    setReadingMode("paged");
                    persistSettings({ readingMode: "paged" });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    readingMode === "paged"
                      ? "bg-[#00E5FF] text-black border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                      : "bg-[#111827] text-gray-400 border-white/5 hover:text-white"
                  }`}
                >
                  Single Page
                </button>
              </div>
            </div>

            {/* Kualitas Gambar */}
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">Kualitas Gambar</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "hd", label: "Original (HD)" },
                  { id: "medium", label: "Compressed" },
                  { id: "low", label: "Hemat Data" },
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setImageQuality(q.id as "hd" | "medium" | "low");
                      persistSettings({ imageQuality: q.id as "hd" | "medium" | "low" });
                    }}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition-all ${
                      imageQuality === q.id
                        ? "bg-[#00E5FF] text-black border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                        : "bg-[#111827] text-gray-400 border-white/5 hover:text-white"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientasi Baca */}
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">Orientasi Navigasi</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "vertical", label: "Atas - Bawah" },
                  { id: "ltr", label: "Kiri ke Kanan" },
                  { id: "rtl", label: "Kanan ke Kiri" },
                ].map((dir) => (
                  <button
                    key={dir.id}
                    onClick={() => setReadingDirection(dir.id as "ltr" | "rtl" | "vertical")}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition-all ${
                      readingDirection === dir.id
                        ? "bg-[#00E5FF] text-black border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                        : "bg-[#111827] text-gray-400 border-white/5 hover:text-white"
                    }`}
                  >
                    {dir.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Scroll Speed */}
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-gray-300">
                <span>Kecepatan Auto Scroll</span>
                <span className="font-mono text-[#00E5FF]">{autoScrollSpeed}x Speed</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={autoScrollSpeed}
                onChange={(e) => setAutoScrollSpeed(parseInt(e.target.value, 10))}
                className="w-full accent-[#00E5FF] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>1x (Santai)</span>
                <span>3x (Normal)</span>
                <span>5x (Cepat)</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. TAMPILAN */}
        <section className="bg-[#111827] rounded-3xl border border-white/5 p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">2. Tampilan & Estetika</h2>
              <p className="text-xs text-gray-400">Konfigurasi tema dan visual Void Portal</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Theme Card */}
            <div className="p-4 rounded-2xl bg-[#080B14] border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Tema Aplikasi</span>
                <span className="text-[11px] text-gray-400">Void Portal (Dark Futuristic)</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-[10px] font-mono text-[#00E5FF]">
                Active
              </span>
            </div>

            {/* Accent Color Card */}
            <div className="p-4 rounded-2xl bg-[#080B14] border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Aksen Neon</span>
                <span className="text-[11px] text-gray-400 font-mono">Cyan Glow (#00E5FF)</span>
              </div>
              <div className="w-5 h-5 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" />
            </div>

            {/* Font Size Reader */}
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 space-y-1.5">
              <span className="text-xs font-bold text-white block">Ukuran Font HUD</span>
              <div className="flex gap-2">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setReaderFontSize(size)}
                    className={`flex-1 py-1 text-xs rounded-lg border font-semibold transition-all ${
                      readerFontSize === size
                        ? "bg-[#00E5FF] text-black border-[#00E5FF]"
                        : "bg-[#111827] text-gray-400 border-white/5"
                    }`}
                  >
                    {size === "sm" ? "Kecil" : size === "md" ? "Normal" : "Besar"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. SUMBER MANGA */}
        <section className="bg-[#111827] rounded-3xl border border-white/5 p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">3. Sumber Manga (Source Manager)</h2>
              <p className="text-xs text-gray-400">Pilih penyedia sumber aktif untuk pencarian dan membaca</p>
            </div>
          </div>

          <div className="space-y-3">
            {sources.map((s) => {
              const isActive = defaultSource === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setDefaultSource(s.id);
                    setActiveSourceId(s.id);
                  }}
                  className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${
                    isActive
                      ? "bg-[#080B14] border-2 border-cyan-500 shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                      : "bg-[#080B14] border border-white/5 hover:border-cyan-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isActive
                          ? "bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]"
                          : "bg-gray-600"
                      }`}
                    />
                    <div>
                      <span className="text-sm font-bold text-white">{s.name}</span>
                      <p className="text-[11px] text-gray-400 font-mono">ID: {s.id} • Bahasa Indonesia</p>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/40 font-bold">
                      Aktif
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full bg-[#111827] text-gray-400 border border-white/5 hover:text-white font-medium">
                      Pilih
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. PENYIMPANAN */}
        <section className="bg-[#111827] rounded-3xl border border-white/5 p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">4. Penyimpanan & IndexedDB</h2>
              <p className="text-xs text-gray-400">Kelola data offline dan ekspor koleksi</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 text-center">
              <span className="text-2xl font-extrabold text-[#00E5FF] font-mono">{dbStats.bookmarks}</span>
              <span className="block text-xs text-gray-400 mt-1">Total Favorit</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 text-center">
              <span className="text-2xl font-extrabold text-[#00E5FF] font-mono">{dbStats.history}</span>
              <span className="block text-xs text-gray-400 mt-1">Total Riwayat</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 text-center">
              <span className="text-2xl font-extrabold text-[#00E5FF] font-mono">{dbStats.downloads}</span>
              <span className="block text-xs text-gray-400 mt-1">Bab Offline</span>
            </div>
          </div>

          {/* Storage Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleClearCache}
              className="p-3.5 rounded-2xl bg-[#080B14] hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-500/30 text-xs font-semibold text-gray-200 hover:text-white flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4 text-[#00E5FF]" />
              <span>Bersihkan Cache Gambar</span>
            </button>

            <button
              onClick={handleExportBookmarks}
              className="p-3.5 rounded-2xl bg-[#080B14] hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-500/30 text-xs font-semibold text-gray-200 hover:text-white flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4 text-[#00E5FF]" />
              <span>Export Bookmark (JSON)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3.5 rounded-2xl bg-[#080B14] hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-500/30 text-xs font-semibold text-gray-200 hover:text-white flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4 text-[#00E5FF]" />
              <span>Import Bookmark (JSON)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBookmarks}
              className="hidden"
            />

            <button
              onClick={handleClearAllStorage}
              className="p-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Reset Semua Data Lokal</span>
            </button>
          </div>
        </section>

        {/* 5. SUPPORT DEVELOPER & MONETISASI */}
        <section className="bg-[#111827] rounded-3xl border border-white/5 p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF]">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">5. Support Developer & Monetisasi</h2>
              <p className="text-xs text-gray-400">Dukung pemeliharaan Void Reader secara sukarela</p>
            </div>
          </div>

          <div className="space-y-4">
            <TopupBanner />
            <DonationCard />
          </div>
        </section>

        {/* 6. AKUN & CLOUD SYNC (SUPABASE) */}
        <section className="bg-[#111827] rounded-3xl border border-white/5 p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">6. Akun & Cloud Sync (Supabase)</h2>
              <p className="text-xs text-gray-400">Sinkronkan favorit dan histori lintas perangkat</p>
            </div>
          </div>

          {/* Sync Message Alert */}
          {syncMessage && (
            <div className="p-4 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-[#00E5FF] text-xs font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {/* Account Card */}
          <div className="p-5 rounded-2xl bg-[#080B14] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00E5FF] overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div>
                <span className="text-sm font-bold text-white block">
                  {user ? (user.user_metadata?.username || user.email) : "Mode Tamu (Lokal)"}
                </span>
                <span className="text-xs text-gray-400 block">
                  {user ? user.email : "Data bookmark tersimpan di IndexedDB browser Anda"}
                </span>
                {lastSync && (
                  <span className="text-[11px] font-mono text-cyan-400 block mt-0.5">
                    Terakhir disinkronkan: {new Date(lastSync).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            <div>
              {user ? (
                <div className="flex items-center gap-2">
                  <NextLink
                    href="/profile"
                    className="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[#00E5FF] text-xs font-bold transition-all"
                  >
                    Profil
                  </NextLink>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              ) : (
                <NextLink
                  href="/login"
                  className="px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black text-xs font-extrabold shadow-[0_0_15px_rgba(0,229,255,0.4)] flex items-center gap-2 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk / Daftar Akun</span>
                </NextLink>
              )}
            </div>
          </div>

          {/* Sync Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleSyncToCloud}
              disabled={syncLoading}
              className="p-3.5 rounded-2xl bg-[#080B14] hover:bg-cyan-950/40 border border-cyan-500/30 text-xs font-semibold text-[#00E5FF] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{syncLoading ? "Menyinkronkan..." : "Upload ke Cloud (Sync)"}</span>
            </button>

            <button
              onClick={handleRestoreFromCloud}
              disabled={syncLoading}
              className="p-3.5 rounded-2xl bg-[#080B14] hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-500/30 text-xs font-semibold text-gray-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{syncLoading ? "Mengambil Data..." : "Restore dari Cloud"}</span>
            </button>
          </div>
        </section>

        {/* Footer Info */}
        <div className="text-center py-6 text-xs text-gray-500 font-mono">
          Void Reader v2.0 Ultimate • Void Portal Futuristic Design • Multi-Source Manga Reader
        </div>
      </div>
    </div>
  );
}
