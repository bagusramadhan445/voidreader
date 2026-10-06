import { db, UserFollowRecord } from "./db";
import { getSupabase } from "./supabase/client";
import { getCurrentUser } from "./supabase/auth";

export interface ToggleFollowParams {
  sourceId: string;
  mangaId: string;
  title: string;
  cover: string;
  lastChapter?: string;
  latestChapter?: string;
}

/**
 * Returns a stable composite key for a followed manga: `${sourceId}::${mangaId}`
 */
export function getFollowId(sourceId: string, mangaId: string): string {
  return `${sourceId.toLowerCase().trim()}::${mangaId.toLowerCase().trim()}`;
}

/**
 * Check if the user is following a manga
 */
export async function isFollowing(sourceId: string, mangaId: string): Promise<boolean> {
  try {
    const id = getFollowId(sourceId, mangaId);
    const local = await db.userFollows.get(id);
    return !!local;
  } catch (err) {
    console.error("[Follows] Error checking follow status:", err);
    return false;
  }
}

/**
 * Follow or unfollow a manga.
 * Returns true if now following, false if unfollowed.
 */
export async function toggleFollow(params: ToggleFollowParams): Promise<boolean> {
  const { sourceId, mangaId, title, cover, lastChapter, latestChapter } = params;
  const id = getFollowId(sourceId, mangaId);

  try {
    const existing = await db.userFollows.get(id);
    const user = await getCurrentUser();
    const userId = user?.id || "guest";
    const supabase = getSupabase();

    if (existing) {
      // Unfollow
      await db.userFollows.delete(id);

      if (supabase && user) {
        try {
          await supabase
            .from("user_follows")
            .delete()
            .eq("user_id", user.id)
            .eq("source_id", sourceId)
            .eq("manga_id", mangaId);
        } catch (cloudErr) {
          console.warn("[Follows] Error deleting follow from cloud:", cloudErr);
        }
      }

      // Dispatch event for UI reactivity
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("void_follow_changed", {
            detail: { id, sourceId, mangaId, isFollowing: false },
          })
        );
      }

      return false;
    } else {
      // Follow
      const newRecord: UserFollowRecord = {
        id,
        userId,
        sourceId,
        mangaId,
        title,
        cover,
        lastChapter: lastChapter || undefined,
        latestChapter: latestChapter || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.userFollows.put(newRecord);

      if (supabase && user) {
        try {
          await supabase.from("user_follows").upsert({
            id: `${user.id}:${sourceId}:${mangaId}`,
            user_id: user.id,
            source_id: sourceId,
            manga_id: mangaId,
            title,
            cover,
            last_chapter: lastChapter || null,
            latest_chapter: latestChapter || null,
            created_at: new Date(newRecord.createdAt).toISOString(),
            updated_at: new Date(newRecord.updatedAt || newRecord.createdAt).toISOString(),
          });
        } catch (cloudErr) {
          console.warn("[Follows] Error syncing follow to cloud:", cloudErr);
        }
      }

      // Dispatch event for UI reactivity
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("void_follow_changed", {
            detail: { id, sourceId, mangaId, isFollowing: true },
          })
        );
      }

      return true;
    }
  } catch (err) {
    console.error("[Follows] Error toggling follow:", err);
    throw err;
  }
}

/**
 * Get all followed manga sorted newest first
 */
export async function getFollowedList(): Promise<UserFollowRecord[]> {
  try {
    const list = await db.userFollows.orderBy("createdAt").reverse().toArray();
    return list;
  } catch (err) {
    console.error("[Follows] Error getting followed list:", err);
    return [];
  }
}

/**
 * Unfollow by sourceId and mangaId
 */
export async function unfollowManga(sourceId: string, mangaId: string): Promise<boolean> {
  const id = getFollowId(sourceId, mangaId);
  try {
    await db.userFollows.delete(id);
    const user = await getCurrentUser();
    const supabase = getSupabase();
    if (supabase && user) {
      await supabase
        .from("user_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("source_id", sourceId)
        .eq("manga_id", mangaId);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("void_follow_changed", {
          detail: { id, sourceId, mangaId, isFollowing: false },
        })
      );
    }
    return true;
  } catch (err) {
    console.error("[Follows] Error unfollowing manga:", err);
    return false;
  }
}

/**
 * Update the last read chapter title in a followed manga
 */
export async function updateFollowLastRead(
  sourceId: string,
  mangaId: string,
  lastChapterTitle: string
): Promise<void> {
  try {
    const id = getFollowId(sourceId, mangaId);
    const existing = await db.userFollows.get(id);
    if (existing) {
      existing.lastChapter = lastChapterTitle;
      existing.updatedAt = Date.now();
      await db.userFollows.put(existing);
    }
  } catch (err) {
    console.warn("[Follows] Could not update last read chapter in follow record:", err);
  }
}
