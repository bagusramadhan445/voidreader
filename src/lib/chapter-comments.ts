import { db, ChapterCommentRecord } from "./db";
import { getSupabase } from "./supabase/client";
import { ChapterComment } from "./supabase/types";

/**
 * Fetches comments for a specific chapter identified by (sourceId + mangaId + chapterId).
 * Primary source: Supabase (shared cloud DB).
 * Offline fallback & cache: Dexie IndexedDB.
 * Returns comments sorted newest first (createdAt descending).
 */
export async function fetchChapterComments(
  sourceId: string,
  mangaId: string,
  chapterId: string
): Promise<ChapterCommentRecord[]> {
  const supabase = getSupabase();
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (supabase && isOnline) {
    try {
      const { data, error } = await supabase
        .from("chapter_comments")
        .select("*")
        .eq("source_id", sourceId)
        .eq("manga_id", mangaId)
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        // Upsert cloud comments into local Dexie cache
        const cloudRecords: ChapterCommentRecord[] = data.map((item: ChapterComment) => ({
          id: item.id,
          sourceId: item.source_id,
          mangaId: item.manga_id,
          chapterId: item.chapter_id,
          userId: item.user_id,
          username: item.username,
          avatar: item.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.username}`,
          comment: item.comment,
          parentId: item.parent_id || null,
          likes: item.likes || 0,
          likedBy: item.liked_by || [],
          createdAt: new Date(item.created_at).getTime(),
          synced: true,
        }));

        for (const record of cloudRecords) {
          await db.chapterComments.put(record);
        }

        // Merge any locally pending unsynced comments for this chapter
        const localPending = await db.chapterComments
          .filter(
            (c) =>
              c.sourceId === sourceId &&
              c.mangaId === mangaId &&
              c.chapterId === chapterId &&
              !c.synced
          )
          .toArray();

        const combinedMap = new Map<string, ChapterCommentRecord>();
        cloudRecords.forEach((r) => combinedMap.set(r.id, r));
        localPending.forEach((r) => combinedMap.set(r.id, r));

        return Array.from(combinedMap.values()).sort((a, b) => b.createdAt - a.createdAt);
      }
    } catch (err) {
      console.warn("[ChapterComments] Supabase fetch failed, falling back to local cache:", err);
    }
  }

  // Fallback: Read from local Dexie IndexedDB cache
  const localList = await db.chapterComments
    .filter(
      (c) =>
        c.sourceId === sourceId &&
        c.mangaId === mangaId &&
        c.chapterId === chapterId
    )
    .toArray();

  return localList.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Adds a new comment or reply for a chapter.
 * Online: writes directly to Supabase and saves to Dexie with synced = true.
 * Offline: saves to Dexie with synced = false for subsequent background sync.
 */
export async function addChapterComment(input: {
  sourceId: string;
  mangaId: string;
  chapterId: string;
  userId: string;
  username: string;
  avatar?: string;
  comment: string;
  parentId?: string | null;
}): Promise<ChapterCommentRecord> {
  const commentId = `cc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const avatar =
    input.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(input.username)}`;
  const now = Date.now();

  const record: ChapterCommentRecord = {
    id: commentId,
    sourceId: input.sourceId,
    mangaId: input.mangaId,
    chapterId: input.chapterId,
    userId: input.userId,
    username: input.username,
    avatar,
    comment: input.comment,
    parentId: input.parentId || null,
    likes: 0,
    likedBy: [],
    createdAt: now,
    synced: false,
  };

  const supabase = getSupabase();
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (supabase && isOnline) {
    try {
      const { error } = await supabase.from("chapter_comments").insert({
        id: record.id,
        source_id: record.sourceId,
        manga_id: record.mangaId,
        chapter_id: record.chapterId,
        user_id: record.userId,
        username: record.username,
        avatar: record.avatar,
        comment: record.comment,
        parent_id: record.parentId,
        likes: 0,
        liked_by: [],
        created_at: new Date(now).toISOString(),
      });

      if (!error) {
        record.synced = true;
      } else {
        console.warn("[ChapterComments] Failed to push to Supabase, queued offline:", error.message);
      }
    } catch (e) {
      console.warn("[ChapterComments] Network error posting to Supabase, queued offline:", e);
    }
  }

  // Save to Dexie cache/queue
  await db.chapterComments.put(record);
  return record;
}

/**
 * Toggles like on a comment.
 */
export async function likeChapterComment(
  commentId: string,
  userId: string
): Promise<{ likes: number; isLiked: boolean }> {
  const existing = await db.chapterComments.get(commentId);
  const likedBy = existing?.likedBy || [];
  const alreadyLiked = likedBy.includes(userId);

  const updatedLikedBy = alreadyLiked
    ? likedBy.filter((id) => id !== userId)
    : [...likedBy, userId];
  const updatedLikes = updatedLikedBy.length;

  if (existing) {
    existing.likes = updatedLikes;
    existing.likedBy = updatedLikedBy;
    await db.chapterComments.put(existing);
  }

  // Push to Supabase if connected
  const supabase = getSupabase();
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (supabase && isOnline) {
    try {
      await supabase
        .from("chapter_comments")
        .update({
          likes: updatedLikes,
          liked_by: updatedLikedBy,
        })
        .eq("id", commentId);
    } catch (err) {
      console.warn("[ChapterComments] Failed to sync like to Supabase:", err);
    }
  }

  return {
    likes: updatedLikes,
    isLiked: !alreadyLiked,
  };
}

/**
 * Deletes a comment and any nested replies.
 */
export async function deleteChapterComment(
  commentId: string,
  userId: string
): Promise<boolean> {
  const comment = await db.chapterComments.get(commentId);
  if (!comment) return false;

  // Authorization check
  if (comment.userId !== userId) {
    throw new Error("Anda hanya dapat menghapus komentar Anda sendiri.");
  }

  // Find all child replies
  const replies = await db.chapterComments
    .filter((c) => c.parentId === commentId)
    .toArray();
  const idsToDelete = [commentId, ...replies.map((r) => r.id)];

  for (const id of idsToDelete) {
    await db.chapterComments.delete(id);
  }

  // Sync delete to Supabase
  const supabase = getSupabase();
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (supabase && isOnline) {
    try {
      await supabase.from("chapter_comments").delete().in("id", idsToDelete);
    } catch (err) {
      console.warn("[ChapterComments] Failed to delete from Supabase:", err);
    }
  }

  return true;
}

/**
 * Flushes all pending unsynced comments to Supabase.
 */
export async function syncPendingComments(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  try {
    const pending = await db.chapterComments.filter((c) => !c.synced).toArray();
    if (pending.length === 0) return 0;

    let syncedCount = 0;
    for (const record of pending) {
      const { error } = await supabase.from("chapter_comments").upsert({
        id: record.id,
        source_id: record.sourceId,
        manga_id: record.mangaId,
        chapter_id: record.chapterId,
        user_id: record.userId,
        username: record.username,
        avatar: record.avatar,
        comment: record.comment,
        parent_id: record.parentId || null,
        likes: record.likes,
        liked_by: record.likedBy,
        created_at: new Date(record.createdAt).toISOString(),
      });

      if (!error) {
        record.synced = true;
        await db.chapterComments.put(record);
        syncedCount++;
      }
    }

    return syncedCount;
  } catch (err) {
    console.warn("[ChapterComments] Error during syncPendingComments:", err);
    return 0;
  }
}

// Auto-sync listener when browser reconnects
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncPendingComments();
  });
}
