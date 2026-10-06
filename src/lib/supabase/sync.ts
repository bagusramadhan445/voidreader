import { getSupabase } from "./client";
import { db } from "../db";
import { CloudBookmark, CloudHistory, CloudReadingProgress, CloudSettings } from "./types";

const LAST_SYNC_KEY = "void_reader_last_sync_timestamp";

export interface SyncStatus {
  lastSyncAt: number | null;
  isSyncing: boolean;
  error: string | null;
}

export function getLastSyncTime(): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(LAST_SYNC_KEY);
  return val ? parseInt(val, 10) : null;
}

export function setLastSyncTime(timestamp: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SYNC_KEY, timestamp.toString());
}

/**
 * Uploads local Dexie bookmarks, history, progress, and settings to Supabase cloud.
 */
export async function syncLocalToCloud(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    setLastSyncTime(Date.now());
    return { success: true };
  }

  try {
    // 1. Sync Bookmarks
    const localBookmarks = await db.bookmarks.toArray();
    if (localBookmarks.length > 0) {
      const cloudBookmarks: CloudBookmark[] = localBookmarks.map((b) => ({
        user_id: userId,
        manga_id: b.id,
        title: b.title,
        cover: b.cover || b.thumbnail,
        type: b.type,
        latest_chapter: b.latestChapter,
        source_id: b.sourceId,
      }));

      await supabase.from("bookmarks").upsert(cloudBookmarks, {
        onConflict: "user_id, manga_id",
      });
    }

    // 2. Sync History
    const localHistory = await db.history.toArray();
    if (localHistory.length > 0) {
      const cloudHistory: CloudHistory[] = localHistory.map((h) => ({
        user_id: userId,
        manga_id: h.id,
        title: h.title,
        cover: h.cover || h.thumbnail,
        chapter_id: h.lastChapterId,
        chapter_title: h.lastChapterTitle,
        source_id: h.sourceId,
        updated_at: new Date(h.lastReadAt).toISOString(),
      }));

      await supabase.from("history").upsert(cloudHistory, {
        onConflict: "user_id, manga_id",
      });
    }

    // 3. Sync Reading Progress
    const localProgress = await db.readingProgress.toArray();
    if (localProgress.length > 0) {
      const cloudProgress: CloudReadingProgress[] = localProgress.map((p) => ({
        user_id: userId,
        chapter_id: p.chapterId,
        manga_id: p.mangaId,
        page: p.pageIndex,
        scroll_position: p.scrollPercent,
        updated_at: new Date(p.updatedAt).toISOString(),
      }));

      await supabase.from("reading_progress").upsert(cloudProgress, {
        onConflict: "user_id, chapter_id",
      });
    }

    // 4. Sync Settings
    const localSettings = await db.userSettings.get("current");
    if (localSettings) {
      const cloudSettings: CloudSettings = {
        user_id: userId,
        theme: localSettings.theme,
        image_quality: localSettings.imageQuality,
        reading_mode: localSettings.readingMode,
        default_source: localSettings.defaultSource,
        updated_at: new Date(localSettings.updatedAt).toISOString(),
      };

      await supabase.from("settings").upsert(cloudSettings, {
        onConflict: "user_id",
      });
    }

    setLastSyncTime(Date.now());
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal sinkronisasi data ke cloud.";
    console.error("[Sync] Error syncLocalToCloud:", err);
    return { success: false, error: msg };
  }
}

/**
 * Restores cloud bookmarks and history from Supabase into local Dexie IndexedDB.
 */
export async function restoreCloudToLocal(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: true };
  }

  try {
    // 1. Fetch Cloud Bookmarks
    const { data: cloudBookmarks, error: bErr } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId);

    if (!bErr && cloudBookmarks && cloudBookmarks.length > 0) {
      for (const item of cloudBookmarks) {
        await db.bookmarks.put({
          id: item.manga_id,
          title: item.title,
          cover: item.cover,
          thumbnail: item.cover || "/placeholder.jpg",
          type: item.type || "Manga",
          latestChapter: item.latest_chapter,
          sourceId: item.source_id || "komiku",
          createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
        });
      }
    }

    // 2. Fetch Cloud History
    const { data: cloudHistory, error: hErr } = await supabase
      .from("history")
      .select("*")
      .eq("user_id", userId);

    if (!hErr && cloudHistory && cloudHistory.length > 0) {
      for (const item of cloudHistory) {
        await db.history.put({
          id: item.manga_id,
          title: item.title || item.manga_id,
          cover: item.cover,
          thumbnail: item.cover || "/placeholder.jpg",
          lastChapterId: item.chapter_id,
          lastChapterTitle: item.chapter_title || "Chapter Terakhir",
          lastReadAt: item.updated_at ? new Date(item.updated_at).getTime() : Date.now(),
          sourceId: item.source_id || "komiku",
        });
      }
    }

    // 3. Fetch Cloud Reading Progress
    const { data: cloudProgress, error: pErr } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", userId);

    if (!pErr && cloudProgress && cloudProgress.length > 0) {
      for (const item of cloudProgress) {
        await db.readingProgress.put({
          chapterId: item.chapter_id,
          mangaId: item.manga_id,
          pageIndex: item.page,
          scrollPercent: item.scroll_position,
          updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : Date.now(),
        });
      }
    }

    setLastSyncTime(Date.now());
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memulihkan data dari cloud.";
    console.error("[Sync] Error restoreCloudToLocal:", err);
    return { success: false, error: msg };
  }
}
