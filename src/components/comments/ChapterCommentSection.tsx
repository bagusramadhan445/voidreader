"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChapterCommentRecord } from "@/lib/db";
import {
  fetchChapterComments,
  addChapterComment,
  likeChapterComment,
  deleteChapterComment,
  syncPendingComments,
} from "@/lib/chapter-comments";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  MessageSquare,
  Heart,
  Reply,
  Trash2,
  Send,
  Loader2,
  CloudOff,
  User,
  CornerDownRight,
  Sparkles,
} from "lucide-react";

interface ChapterCommentSectionProps {
  sourceId: string;
  mangaId: string;
  chapterId: string;
  chapterNumber?: string | number;
  className?: string;
}

export const ChapterCommentSection: React.FC<ChapterCommentSectionProps> = ({
  sourceId,
  mangaId,
  chapterId,
  chapterNumber,
  className = "",
}) => {
  const [comments, setComments] = useState<ChapterCommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New comment input
  const [commentText, setCommentText] = useState("");

  // Reply state: id of comment being replied to
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Current user state (logged-in Supabase user or guest)
  const [user, setUser] = useState<{ id: string; username: string; avatar: string } | null>(null);
  const [guestName, setGuestName] = useState("");

  // 1. Initialize user
  useEffect(() => {
    async function initUser() {
      try {
        const authUser = await getCurrentUser();
        if (authUser) {
          const uname =
            authUser.user_metadata?.username ||
            authUser.email?.split("@")[0] ||
            "Pembaca";
          const avatar =
            authUser.user_metadata?.avatar_url ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uname)}`;
          setUser({ id: authUser.id, username: uname, avatar });
          return;
        }

        // Guest user from localStorage
        if (typeof window !== "undefined") {
          let gId = localStorage.getItem("void_guest_uid");
          let gName = localStorage.getItem("void_guest_uname");
          if (!gId) {
            gId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            localStorage.setItem("void_guest_uid", gId);
          }
          if (gName) {
            setGuestName(gName);
            setUser({
              id: gId,
              username: gName,
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(gName)}`,
            });
          } else {
            // Default guest
            setUser({
              id: gId,
              username: "Pembaca",
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(gId)}`,
            });
          }
        }
      } catch (err) {
        console.warn("[ChapterCommentSection] User init error:", err);
      }
    }
    initUser();
  }, []);

  // 2. Load comments for this exact chapter
  const loadComments = useCallback(async () => {
    if (!sourceId || !mangaId || !chapterId) return;
    try {
      setLoading(true);
      const list = await fetchChapterComments(sourceId, mangaId, chapterId);
      setComments(list);
    } catch (err) {
      console.error("[ChapterCommentSection] Error loading comments:", err);
    } finally {
      setLoading(false);
    }
  }, [sourceId, mangaId, chapterId]);

  useEffect(() => {
    loadComments();
    // Background sync of any previously queued comments
    syncPendingComments().then((synced) => {
      if (synced > 0) loadComments();
    });
  }, [loadComments]);

  // 3. Handle Add Top-level Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submitting || !user) return;

    try {
      setSubmitting(true);
      const activeUsername = guestName.trim() || user.username || "Pembaca";
      if (typeof window !== "undefined" && guestName.trim()) {
        localStorage.setItem("void_guest_uname", guestName.trim());
      }

      const newRecord = await addChapterComment({
        sourceId,
        mangaId,
        chapterId,
        userId: user.id,
        username: activeUsername,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activeUsername)}`,
        comment: commentText.trim(),
      });

      setComments((prev) => [newRecord, ...prev]);
      setCommentText("");
    } catch (err) {
      console.error("[ChapterCommentSection] Add comment error:", err);
      alert("Gagal mengirim komentar. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Handle Add Reply
  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim() || replySubmitting || !user) return;

    try {
      setReplySubmitting(true);
      const activeUsername = guestName.trim() || user.username || "Pembaca";

      const newRecord = await addChapterComment({
        sourceId,
        mangaId,
        chapterId,
        userId: user.id,
        username: activeUsername,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activeUsername)}`,
        comment: replyText.trim(),
        parentId,
      });

      setComments((prev) => [newRecord, ...prev]);
      setReplyText("");
      setReplyingToId(null);
    } catch (err) {
      console.error("[ChapterCommentSection] Add reply error:", err);
      alert("Gagal mengirim balasan.");
    } finally {
      setReplySubmitting(false);
    }
  };

  // 5. Handle Like
  const handleLike = async (commentId: string) => {
    if (!user) return;
    try {
      const { likes, isLiked } = await likeChapterComment(commentId, user.id);
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            const updatedLikedBy = isLiked
              ? [...(c.likedBy || []), user.id]
              : (c.likedBy || []).filter((id) => id !== user.id);
            return { ...c, likes, likedBy: updatedLikedBy };
          }
          return c;
        })
      );
    } catch (err) {
      console.error("[ChapterCommentSection] Like error:", err);
    }
  };

  // 6. Handle Delete
  const handleDelete = async (commentId: string) => {
    if (!user) return;
    if (!window.confirm("Hapus komentar ini?")) return;

    try {
      await deleteChapterComment(commentId, user.id);
      // Remove comment and any replies
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
    } catch (err) {
      console.error("[ChapterCommentSection] Delete error:", err);
      alert("Gagal menghapus komentar.");
    }
  };

  // Organize comments into top-level comments and replies map
  const { topLevelComments, repliesMap, totalCommentsCount } = useMemo(() => {
    const topLevel: ChapterCommentRecord[] = [];
    const replies: Record<string, ChapterCommentRecord[]> = {};

    for (const c of comments) {
      if (c.parentId) {
        if (!replies[c.parentId]) replies[c.parentId] = [];
        replies[c.parentId].push(c);
      } else {
        topLevel.push(c);
      }
    }

    // Sort top-level newest first
    topLevel.sort((a, b) => b.createdAt - a.createdAt);

    // Sort replies chronologically inside parent (oldest to newest for natural conversation)
    for (const pId in replies) {
      replies[pId].sort((a, b) => a.createdAt - b.createdAt);
    }

    return {
      topLevelComments: topLevel,
      repliesMap: replies,
      totalCommentsCount: comments.length,
    };
  }, [comments]);

  const displayTitle = chapterNumber
    ? `Komentar Chapter ${chapterNumber}`
    : "Komentar Chapter";

  return (
    <section
      data-no-tap="true"
      className={`rounded-3xl bg-[#111827] border border-cyan-500/20 p-5 sm:p-7 shadow-2xl ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-[#00E5FF]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{displayTitle}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                {totalCommentsCount}
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Diskusi khusus bab ini. Komentar Anda dibagikan kepada seluruh pembaca.
            </p>
          </div>
        </div>
      </div>

      {/* Add Top-Level Comment Form */}
      <form onSubmit={handleAddComment} className="mt-5 space-y-3">
        {/* Guest Name input if not authenticated */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#080B14] border border-gray-800 text-xs text-gray-300">
            <User className="w-3.5 h-3.5 text-[#00E5FF]" />
            <input
              type="text"
              placeholder="Nama Anda (opsional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none w-36 sm:w-48"
            />
          </div>
        </div>

        <div className="relative">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={`Tulis komentar untuk bab ini...`}
            rows={3}
            maxLength={1000}
            className="w-full bg-[#080B14] text-xs sm:text-sm text-gray-100 placeholder-gray-500 p-3.5 rounded-2xl border border-gray-800 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/30 transition-all resize-none"
          />
          <div className="absolute right-3 bottom-3 text-[10px] text-gray-500 font-mono">
            {commentText.length}/1000
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!commentText.trim() || submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-[#00E5FF] text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_20px_rgba(0,229,255,0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Komentar</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Comment List */}
      <div className="mt-8 space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-cyan-400 text-xs font-mono">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span>MEMUAT KOMENTAR CHAPTER...</span>
          </div>
        ) : topLevelComments.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-[#080B14]/40 border border-white/5 p-6">
            <Sparkles className="w-8 h-8 text-cyan-400/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-300 mb-1">Belum Ada Komentar</p>
            <p className="text-xs text-gray-500">
              Jadilah orang pertama yang mengomentari chapter ini!
            </p>
          </div>
        ) : (
          topLevelComments.map((comment) => {
            const replies = repliesMap[comment.id] || [];
            const isAuthor = user?.id === comment.userId;
            const hasLiked = user && (comment.likedBy || []).includes(user.id);
            const formattedDate = new Date(comment.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={comment.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#080B14] border border-white/5 hover:border-cyan-500/30 transition-all space-y-3 group"
              >
                {/* Header: User & Date */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={comment.avatar}
                      alt={comment.username}
                      className="w-8 h-8 rounded-full bg-gray-800 border border-cyan-500/30 object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{comment.username}</span>
                        {!comment.synced && (
                          <span
                            title="Disimpan offline, akan otomatis disinkronkan ke server"
                            className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20"
                          >
                            <CloudOff className="w-2.5 h-2.5" /> Offline
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">{formattedDate}</span>
                    </div>
                  </div>

                  {/* Delete Button (Author only) */}
                  {isAuthor && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      title="Hapus Komentar"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Comment Text */}
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words pl-11">
                  {comment.comment}
                </p>

                {/* Action Buttons: Like & Reply */}
                <div className="flex items-center gap-4 pl-11 pt-1">
                  {/* Like Button */}
                  <button
                    onClick={() => handleLike(comment.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      hasLiked
                        ? "text-rose-400"
                        : "text-gray-400 hover:text-rose-400"
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${hasLiked ? "fill-current text-rose-400" : ""}`}
                    />
                    <span>{comment.likes || 0}</span>
                  </button>

                  {/* Reply Button */}
                  <button
                    onClick={() => {
                      if (replyingToId === comment.id) {
                        setReplyingToId(null);
                      } else {
                        setReplyingToId(comment.id);
                        setReplyText("");
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#00E5FF] transition-colors"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Balas</span>
                  </button>
                </div>

                {/* Inline Reply Form */}
                {replyingToId === comment.id && (
                  <div className="ml-11 mt-3 p-3.5 rounded-xl bg-[#111827] border border-cyan-500/20 space-y-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Balas ${comment.username}...`}
                      rows={2}
                      maxLength={500}
                      className="w-full bg-[#080B14] text-xs text-gray-100 placeholder-gray-500 p-2.5 rounded-xl border border-gray-800 focus:border-[#00E5FF] focus:outline-none resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setReplyingToId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyText.trim() || replySubmitting}
                        className="px-4 py-1.5 rounded-lg bg-[#00E5FF] text-black font-bold text-xs disabled:opacity-40"
                      >
                        {replySubmitting ? "Mengirim..." : "Kirim Balasan"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Nested Replies List */}
                {replies.length > 0 && (
                  <div className="ml-11 mt-3 space-y-2.5 border-l-2 border-cyan-500/20 pl-3 sm:pl-4">
                    {replies.map((reply) => {
                      const isReplyAuthor = user?.id === reply.userId;
                      const replyHasLiked = user && (reply.likedBy || []).includes(user.id);
                      const replyFormattedDate = new Date(reply.createdAt).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      );

                      return (
                        <div
                          key={reply.id}
                          className="p-3 rounded-xl bg-[#111827]/70 border border-white/5 space-y-1.5 group/reply"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CornerDownRight className="w-3 h-3 text-[#00E5FF]/60" />
                              <img
                                src={reply.avatar}
                                alt={reply.username}
                                className="w-6 h-6 rounded-full bg-gray-800 object-cover"
                              />
                              <span className="text-xs font-semibold text-white">
                                {reply.username}
                              </span>
                              {!reply.synced && (
                                <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1 rounded">
                                  Offline
                                </span>
                              )}
                              <span className="text-[10px] text-gray-500 font-mono">
                                {replyFormattedDate}
                              </span>
                            </div>

                            {/* Delete Reply Button */}
                            {isReplyAuthor && (
                              <button
                                onClick={() => handleDelete(reply.id)}
                                title="Hapus Balasan"
                                className="p-1 text-gray-500 hover:text-rose-400 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap break-words pl-5">
                            {reply.comment}
                          </p>

                          <div className="pl-5 pt-0.5">
                            <button
                              onClick={() => handleLike(reply.id)}
                              className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                                replyHasLiked
                                  ? "text-rose-400"
                                  : "text-gray-400 hover:text-rose-400"
                              }`}
                            >
                              <Heart
                                className={`w-3 h-3 ${
                                  replyHasLiked ? "fill-current text-rose-400" : ""
                                }`}
                              />
                              <span>{reply.likes || 0}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
