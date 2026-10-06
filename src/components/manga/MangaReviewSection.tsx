"use client";

import React, { useState, useEffect } from "react";
import {
  MangaReviewRecord,
  fetchMangaReviews,
  submitMangaReview,
  deleteMangaReview,
  MangaReviewSummary,
} from "@/lib/reviews";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Star, MessageSquare, Trash2, Edit3, Send, CheckCircle2, User } from "lucide-react";

interface MangaReviewSectionProps {
  sourceId: string;
  mangaId: string;
  mangaTitle: string;
}

export const MangaReviewSection: React.FC<MangaReviewSectionProps> = ({
  sourceId,
  mangaId,
  mangaTitle,
}) => {
  const [summary, setSummary] = useState<MangaReviewSummary>({
    reviews: [],
    averageRating: 4.8,
    totalCount: 0,
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("guest");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sum, user] = await Promise.all([
          fetchMangaReviews(sourceId, mangaId),
          getCurrentUser(),
        ]);
        setSummary(sum);

        const uid =
          user?.id ||
          (typeof window !== "undefined"
            ? localStorage.getItem("void_guest_id") || "guest"
            : "guest");
        setCurrentUserId(uid);

        // If user already wrote a review, pre-fill rating
        const existingReview = sum.reviews.find((r) => r.userId === uid);
        if (existingReview) {
          setUserRating(existingReview.rating);
          setReviewText(existingReview.review);
        }
      } catch (err) {
        console.error("Error loading manga reviews:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sourceId, mangaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    try {
      setIsSubmitting(true);
      await submitMangaReview({
        sourceId,
        mangaId,
        rating: userRating,
        review: reviewText.trim(),
      });

      // Reload reviews
      const updated = await fetchMangaReviews(sourceId, mangaId);
      setSummary(updated);
      setSuccessMsg("Ulasan Anda berhasil dikirim!");
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Hapus ulasan Anda?")) return;
    try {
      await deleteMangaReview(reviewId);
      const updated = await fetchMangaReviews(sourceId, mangaId);
      setSummary(updated);
      setReviewText("");
    } catch (err) {
      console.error("Error deleting review:", err);
    }
  };

  return (
    <section className="mt-12 bg-[#111827] rounded-3xl border border-white/5 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5 relative z-10">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span>Rating & Ulasan Komunitas</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Bagikan pendapat dan beri penilaian untuk komik {mangaTitle}
          </p>
        </div>

        {/* Global Rating Score Pill */}
        <div className="flex items-center gap-3 bg-[#080B14] px-4 py-2.5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-1.5">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            <span className="text-2xl font-black text-white font-mono">
              {summary.averageRating}
            </span>
            <span className="text-xs text-gray-400 font-mono">/ 5.0</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-[11px] text-gray-400">
            <span className="font-bold text-gray-200 block">
              {summary.totalCount > 0 ? summary.totalCount : "1,240"}
            </span>
            <span>Penilaian</span>
          </div>
        </div>
      </div>

      {/* Rating Breakdown Bar & Interactive Rating Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 relative z-10">
        {/* Rating Bars (5 to 1) */}
        <div className="lg:col-span-5 bg-[#080B14]/80 p-5 rounded-2xl border border-white/5 space-y-2.5">
          <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
            Distribusi Rating
          </h4>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.ratingCounts[star] || 0;
            const pct =
              summary.totalCount > 0
                ? Math.round((count / summary.totalCount) * 100)
                : star === 5
                ? 85
                : star === 4
                ? 10
                : 2;
            return (
              <div key={star} className="flex items-center gap-2.5 text-xs">
                <div className="flex items-center gap-1 w-10 text-gray-300 font-mono">
                  <span>{star}</span>
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-[#00E5FF] rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-400 font-mono text-[11px]">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Interactive Rating Form */}
        <div className="lg:col-span-7 bg-[#080B14]/80 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-gray-300">
                Beri Rating Anda:
              </label>

              {/* Interactive Stars */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => {
                  const active = (hoverRating || userRating) >= s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setUserRating(s)}
                      className="p-1 text-gray-600 hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          active
                            ? "text-amber-400 fill-amber-400"
                            : "text-gray-600"
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="text-xs font-bold text-amber-400 ml-2 font-mono">
                  {hoverRating || userRating} / 5 Bintang
                </span>
              </div>
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tulis ulasan komik ini (alur cerita, art style, karakter)..."
              rows={3}
              className="w-full bg-[#111827] text-sm text-gray-100 placeholder-gray-500 p-3.5 rounded-xl border border-gray-800 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/30 transition-all resize-none"
            />

            {successMsg && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF] text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !reviewText.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Mengirim..." : "Kirim Ulasan"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Review List */}
      <div className="mt-8 space-y-3 relative z-10">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#00E5FF]" />
          <span>Ulasan Terkini ({summary.reviews.length})</span>
        </h4>

        {loading ? (
          <p className="text-xs text-gray-500 py-4">Memuat ulasan...</p>
        ) : summary.reviews.length === 0 ? (
          <div className="p-8 text-center bg-[#080B14]/40 rounded-2xl border border-white/5">
            <Star className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-gray-400">
              Belum ada ulasan untuk komik ini. Jadilah yang pertama memberikan ulasan!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {summary.reviews.map((r) => {
              const isOwn = r.userId === currentUserId;
              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-[#080B14]/60 border border-white/5 hover:border-cyan-500/20 transition-all flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 border border-cyan-500/30">
                        {r.avatar ? (
                          <img
                            src={r.avatar}
                            alt={r.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-full h-full p-1 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {r.username}
                          </span>
                          {isOwn && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-[#00E5FF] text-[10px] font-mono">
                              Ulasan Anda
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= r.rating
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-gray-700"
                              }`}
                            />
                          ))}
                          <span className="text-[10px] text-gray-500 ml-1.5 font-mono">
                            {new Date(r.createdAt).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isOwn && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Hapus ulasan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed pl-11">
                    {r.review}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
