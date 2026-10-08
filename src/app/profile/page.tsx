"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, HistoryRecord } from "@/lib/db";
import { getCurrentUser, signOut } from "@/lib/supabase/auth";
import { syncLocalToCloud, getLastSyncTime } from "@/lib/supabase/sync";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  User,
  Bookmark,
  BookOpen,
  Clock,
  Sparkles,
  RefreshCw,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Edit3,
  Check,
  Play,
  Award,
  Flame,
  Trophy,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalTitles, setTotalTitles] = useState(0);
  const [totalChapters, setTotalChapters] = useState(0);
  const [completedManga, setCompletedManga] = useState(0);
  const [totalBookmarks, setTotalBookmarks] = useState(0);
  const [readingStreak, setReadingStreak] = useState(1);
  const [recentHistory, setRecentHistory] = useState<HistoryRecord[]>([]);

  // Sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Edit username state
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");

  useEffect(() => {
    async function loadProfileData() {
      try {
        setLoading(true);
        const [currentUser, allHistory, allProgress, bCount] = await Promise.all([
          getCurrentUser(),
          db.history.toArray(),
          db.readingProgress.toArray(),
          db.bookmarks.count(),
        ]);

        if (!currentUser) {
          router.replace("/login?redirect=/profile");
          return;
        }

        setUser(currentUser);
        if (currentUser?.user_metadata?.username) {
          setEditUsername(currentUser.user_metadata.username);
        } else if (currentUser?.email) {
          setEditUsername(currentUser.email.split("@")[0]);
        }

        const hCount = allHistory.length;
        const pCount = allProgress.length;

        // Completed manga count (heuristic: titles read > 20 chapters or marked completed)
        const completed = allHistory.filter((h) => {
          const titleLower = (h.title || "").toLowerCase();
          return titleLower.includes("tamat") || titleLower.includes("end");
        }).length;

        // Calculate consecutive reading streak days
        const dates = new Set<string>();
        const toDateStr = (ts: number) => {
          const d = new Date(ts);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        };

        allHistory.forEach((h) => {
          if (h.lastReadAt) dates.add(toDateStr(h.lastReadAt));
        });
        allProgress.forEach((p) => {
          if (p.updatedAt) dates.add(toDateStr(p.updatedAt));
        });

        let streak = 0;
        if (dates.size > 0) {
          const now = new Date();
          const todayStr = toDateStr(now.getTime());
          const yesterday = new Date(now.getTime() - 86400000);
          const yesterdayStr = toDateStr(yesterday.getTime());

          let currentTarget = dates.has(todayStr) ? now : dates.has(yesterdayStr) ? yesterday : null;
          if (currentTarget) {
            let checkDate = new Date(currentTarget.getTime());
            while (true) {
              const checkStr = toDateStr(checkDate.getTime());
              if (dates.has(checkStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
              } else {
                break;
              }
            }
          } else {
            streak = 1; // Default initial streak for active visitor
          }
        } else {
          streak = 1;
        }

        const sortedRecent = [...allHistory]
          .sort((a, b) => b.lastReadAt - a.lastReadAt)
          .slice(0, 3);

        setTotalTitles(hCount);
        setTotalChapters(pCount);
        setCompletedManga(completed);
        setReadingStreak(Math.max(1, streak));
        setTotalBookmarks(bCount);
        setRecentHistory(sortedRecent);
        setLastSync(getLastSyncTime());
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfileData();
  }, []);

  // Calculate estimated reading time (~5 min per chapter)
  const calculateReadingTime = () => {
    const totalMinutes = totalChapters * 5;
    if (totalMinutes < 60) {
      return `${totalMinutes} Menit`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} Jam ${minutes > 0 ? `${minutes} M` : ""}`;
  };

  const handleSyncNow = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setSyncLoading(true);
    setSyncMsg(null);
    try {
      const res = await syncLocalToCloud(user.id);
      if (res.success) {
        setSyncMsg("Data Cloud berhasil disinkronkan!");
        setLastSync(Date.now());
      } else {
        setSyncMsg(`Gagal: ${res.error}`);
      }
    } catch {
      setSyncMsg("Terjadi kegagalan sinkronisasi.");
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncMsg(null), 3000);
    }
  };

  const handleSignOut = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari akun?")) {
      await signOut();
      router.push("/");
    }
  };

  const handleSaveUsername = () => {
    if (user && editUsername.trim()) {
      user.user_metadata = {
        ...user.user_metadata,
        username: editUsername.trim(),
      };
      setIsEditing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const username = user?.user_metadata?.username || (user?.email ? user.email.split("@")[0] : "Penjelajah Void");
  const avatarUrl = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  return (
    <div className="min-h-screen pb-28 pt-20 bg-[#080B14]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Sync alert */}
        {syncMsg && (
          <div className="p-4 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-[#00E5FF] text-xs font-semibold flex items-center gap-2 shadow-lg">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{syncMsg}</span>
          </div>
        )}

        {/* PROFILE HEADER CARD */}
        <div className="bg-[#111827] rounded-3xl border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_40px_rgba(0,229,255,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-[#080B14] border-2 border-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.3)] overflow-hidden shrink-0">
                <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
              </div>

              {/* Username & Badge */}
              <div>
                <div className="flex items-center gap-2.5">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="bg-[#080B14] border border-cyan-500/50 rounded-xl px-3 py-1 text-sm text-white focus:outline-none"
                      />
                      <button
                        onClick={handleSaveUsername}
                        className="p-1.5 rounded-lg bg-[#00E5FF] text-black"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-white">{username}</h1>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 rounded-lg text-gray-400 hover:text-[#00E5FF] transition-colors"
                        title="Ubah Username"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <p className="text-xs text-gray-400 mt-0.5">
                  {user?.email || "Akun Mode Tamu Lokal"}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono text-[#00E5FF] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{user ? "Cloud Sync Aktif" : "Tamu Lokal"}</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-300 flex items-center gap-1 font-bold">
                    <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{readingStreak} Hari Streak</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-mono text-purple-300 flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    <span>Pembaca VIP</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2.5 sm:self-center">
              <button
                onClick={handleSyncNow}
                disabled={syncLoading}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-[#00E5FF] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? "animate-spin" : ""}`} />
                <span>{syncLoading ? "Sinkronisasi..." : "Sync Cloud"}</span>
              </button>

              {user ? (
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black text-xs font-extrabold shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all"
                >
                  Masuk Akun
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* READING STREAK CARD */}
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent rounded-3xl border border-amber-500/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-950/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
              <Flame className="w-8 h-8 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  🔥 {readingStreak} Hari Reading Streak!
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                  Aktif
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Pertahankan streak membaca Anda setiap hari untuk membuka lencana khusus!
              </p>
            </div>
          </div>
          <div className="text-right sm:self-center">
            <span className="text-xs font-mono text-amber-400 font-bold block">
              Konsistensi Membaca
            </span>
            <span className="text-[11px] text-gray-400">
              Target: Minimal 1 bab/hari
            </span>
          </div>
        </div>

        {/* READING STATISTICS */}
        <section className="bg-[#111827] rounded-3xl border border-white/5 p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
            <Sparkles className="w-5 h-5 text-[#00E5FF]" />
            <h2 className="text-base sm:text-lg font-bold text-white">Statistik Membaca</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 text-center">
              <BookOpen className="w-5 h-5 text-[#00E5FF] mx-auto mb-1.5 opacity-80" />
              <span className="text-2xl font-extrabold text-white font-mono block">
                {totalTitles}
              </span>
              <span className="text-xs text-gray-400">Judul Dibaca</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 text-center">
              <Play className="w-5 h-5 text-[#00E5FF] mx-auto mb-1.5 opacity-80" />
              <span className="text-2xl font-extrabold text-white font-mono block">
                {totalChapters}
              </span>
              <span className="text-xs text-gray-400">Bab Selesai</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5 opacity-80" />
              <span className="text-2xl font-extrabold text-white font-mono block">
                {completedManga}
              </span>
              <span className="text-xs text-gray-400">Komik Tamat</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 text-center">
              <Clock className="w-5 h-5 text-[#00E5FF] mx-auto mb-1.5 opacity-80" />
              <span className="text-lg sm:text-xl font-extrabold text-white font-mono block mt-0.5">
                {calculateReadingTime()}
              </span>
              <span className="text-xs text-gray-400">Waktu Membaca</span>
            </div>
          </div>
        </section>

        {/* READER ACHIEVEMENTS & BADGES */}
        <section className="bg-[#111827] rounded-3xl border border-white/5 p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">Lencana & Pencapaian</h2>
            </div>
            <span className="text-xs text-cyan-400 font-mono">
              {[
                { req: 10 },
                { req: 50 },
                { req: 100 },
                { req: 250 },
                { req: 500 },
                { req: 1000 },
              ].filter((b) => totalChapters >= b.req).length} / 6 Terbuka
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {[
              {
                id: "scout",
                name: "Void Scout",
                req: 10,
                desc: "Selesaikan 10 bab manga pertama",
                icon: "🧭",
              },
              {
                id: "explorer",
                name: "Manga Explorer",
                req: 50,
                desc: "Selesaikan 50 bab bacaan",
                icon: "🗺️",
              },
              {
                id: "novice",
                name: "Novice Reader",
                req: 100,
                desc: "Pencapaian 100 bab membaca",
                icon: "📖",
              },
              {
                id: "avid",
                name: "Avid Reader",
                req: 250,
                desc: "Pencapaian 250 bab membaca",
                icon: "⭐",
              },
              {
                id: "lore",
                name: "Lore Hunter",
                req: 500,
                desc: "Pencapaian 500 bab membaca",
                icon: "🔮",
              },
              {
                id: "master",
                name: "Void Master",
                req: 1000,
                desc: "Legenda pembaca mencapai 1000 bab membaca",
                icon: "👑",
              },
            ].map((badge) => {
              const isUnlocked = totalChapters >= badge.req;
              const progress = Math.min(100, Math.round((totalChapters / badge.req) * 100));

              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isUnlocked
                      ? "bg-[#080B14] border-cyan-500/40 shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                      : "bg-[#080B14]/60 border-white/5 opacity-75"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-2xl">{badge.icon}</span>
                      {isUnlocked ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/40">
                          <CheckCircle2 className="w-3 h-3 text-[#00E5FF]" />
                          <span>Terbuka</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-white/5">
                          <Lock className="w-3 h-3" />
                          <span>Terkunci</span>
                        </span>
                      )}
                    </div>
                    <h4 className={`text-sm font-bold ${isUnlocked ? "text-white" : "text-gray-300"}`}>
                      {badge.name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {badge.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5">
                    <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1.5">
                      <span>Progres</span>
                      <span className={isUnlocked ? "text-[#00E5FF] font-bold" : "text-gray-400"}>
                        {Math.min(totalChapters, badge.req)} / {badge.req} Bab
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isUnlocked ? "bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" : "bg-cyan-500/40"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RECENT READING ACTIVITY */}
        <section className="bg-[#111827] rounded-3xl border border-white/5 p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-[#00E5FF]" />
              <h2 className="text-base sm:text-lg font-bold text-white">Aktivitas Terakhir Dibaca</h2>
            </div>
            <Link
              href="/library"
              className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentHistory.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">
              Belum ada riwayat manga yang dibaca. Mulai jelajahi di Beranda!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {recentHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#080B14] border border-white/5 flex gap-3 hover:border-cyan-500/40 transition-all group"
                >
                  <img
                    src={item.cover || item.thumbnail || "/placeholder.jpg"}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-14 h-20 object-cover rounded-xl shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="text-xs font-bold text-white truncate" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-cyan-400 font-mono mt-0.5 truncate">
                        {item.lastChapterTitle}
                      </p>
                    </div>

                    <Link
                      href={`/reader/${item.lastChapterId}?manga=${item.id}`}
                      className="px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-[#00E5FF] text-[11px] font-bold flex items-center gap-1 w-fit transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Lanjut</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
