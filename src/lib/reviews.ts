import { db, MangaReviewRecord } from "./db";
import { getSupabase } from "./supabase/client";
import { getCurrentUser } from "./supabase/auth";

export type { MangaReviewRecord };

export interface MangaReviewSummary {
  reviews: MangaReviewRecord[];
  averageRating: number;
  totalCount: number;
  ratingCounts: Record<number, number>; // 1 -> count, 2 -> count, ...
}

export interface SubmitReviewParams {
  sourceId: string;
  mangaId: string;
  rating: number; // 1 to 5
  review: string;
  username?: string;
  avatar?: string;
}

/**
 * Fetch reviews and computed rating metrics for a given manga.
 * Merges Supabase cloud reviews and local Dexie records.
 */
export async function fetchMangaReviews(
  sourceId: string,
  mangaId: string
): Promise<MangaReviewSummary> {
  const normSource = sourceId.toLowerCase().trim();
  const normManga = mangaId.toLowerCase().trim();
  const supabase = getSupabase();
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (supabase && isOnline) {
    try {
      const { data, error } = await supabase
        .from("manga_reviews")
        .select("*")
        .eq("source_id", normSource)
        .eq("manga_id", normManga)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const item of data) {
          const rec: MangaReviewRecord = {
            id: item.id,
            sourceId: item.source_id,
            mangaId: item.manga_id,
            userId: item.user_id,
            username: item.username,
            avatar: item.avatar || undefined,
            rating: item.rating,
            review: item.review,
            createdAt: new Date(item.created_at).getTime(),
            updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : undefined,
            synced: true,
          };
          await db.mangaReviews.put(rec);
        }
      }
    } catch (err) {
      console.warn("[Reviews] Cloud fetch error, reading from local Dexie:", err);
    }
  }

  // Read all reviews from local Dexie
  const localList = await db.mangaReviews
    .filter((r) => r.sourceId.toLowerCase() === normSource && r.mangaId.toLowerCase() === normManga)
    .toArray();

  localList.sort((a, b) => b.createdAt - a.createdAt);

  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const r of localList) {
    const star = Math.max(1, Math.min(5, Math.round(r.rating)));
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    sum += r.rating;
  }

  const totalCount = localList.length;
  // If no user reviews yet, provide baseline rating 4.8 / 5.0 with 0 user reviews
  const averageRating = totalCount > 0 ? Number((sum / totalCount).toFixed(1)) : 4.8;

  return {
    reviews: localList,
    averageRating,
    totalCount,
    ratingCounts,
  };
}

/**
 * Submit or update a user's review for a manga.
 */
export async function submitMangaReview(
  params: SubmitReviewParams
): Promise<MangaReviewRecord> {
  const normSource = params.sourceId.toLowerCase().trim();
  const normManga = params.mangaId.toLowerCase().trim();
  const rating = Math.max(1, Math.min(5, Math.round(params.rating)));
  const review = params.review.trim();

  const user = await getCurrentUser();
  const userId = user?.id || (typeof window !== "undefined" ? localStorage.getItem("void_guest_id") || "guest_" + Math.random().toString(36).substring(2, 9) : "guest");
  if (typeof window !== "undefined" && !localStorage.getItem("void_guest_id")) {
    localStorage.setItem("void_guest_id", userId);
  }

  const username =
    params.username ||
    user?.user_metadata?.username ||
    (user?.email ? user.email.split("@")[0] : "Pembaca Void");
  const avatar =
    params.avatar ||
    user?.user_metadata?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  // Check if user already reviewed this manga
  const existing = await db.mangaReviews
    .filter((r) => r.sourceId.toLowerCase() === normSource && r.mangaId.toLowerCase() === normManga && r.userId === userId)
    .first();

  const reviewId = existing ? existing.id : `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const record: MangaReviewRecord = {
    id: reviewId,
    sourceId: normSource,
    mangaId: normManga,
    userId,
    username,
    avatar,
    rating,
    review,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
    synced: false,
  };

  await db.mangaReviews.put(record);

  // Sync to Supabase if connected
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("manga_reviews").upsert({
        id: record.id,
        source_id: record.sourceId,
        manga_id: record.mangaId,
        user_id: record.userId,
        username: record.username,
        avatar: record.avatar || null,
        rating: record.rating,
        review: record.review,
        created_at: new Date(record.createdAt).toISOString(),
        updated_at: new Date(record.updatedAt || now).toISOString(),
      });
      if (!error) {
        record.synced = true;
        await db.mangaReviews.put(record);
      }
    } catch (e) {
      console.warn("[Reviews] Cloud upsert skipped:", e);
    }
  }

  return record;
}

/**
 * Delete a review by review ID.
 */
export async function deleteMangaReview(reviewId: string): Promise<boolean> {
  try {
    await db.mangaReviews.delete(reviewId);
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("manga_reviews").delete().eq("id", reviewId);
    }
    return true;
  } catch (err) {
    console.error("[Reviews] Delete review error:", err);
    return false;
  }
}
