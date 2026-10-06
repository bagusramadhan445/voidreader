"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CloudComment } from "@/lib/supabase/types";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/client";
import { db } from "@/lib/db";
import { CommentInput } from "./CommentInput";
import { CommentItem } from "./CommentItem";
import { MessageSquare, Sparkles } from "lucide-react";

interface CommentSectionProps {
  mangaId: string;
  mangaTitle?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  mangaId,
  mangaTitle,
}) => {
  const [comments, setComments] = useState<CloudComment[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Load user auth & comments
  const loadComments = useCallback(async () => {
    try {
      setLoading(true);

      // Check current user
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          username: user.user_metadata?.username || user.email?.split("@")[0] || "Pembaca",
        });
      } else {
        setCurrentUser(null);
      }

      // Check Supabase comments
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from("comments")
          .select("*")
          .eq("manga_id", mangaId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setComments(data as CloudComment[]);
          return;
        }
      }

      // Fallback: Read from local Dexie IndexedDB comments cache
      const local = await db.comments.where("mangaId").equals(mangaId).reverse().sortBy("createdAt");
      if (local && local.length > 0) {
        setComments(
          local.map((l) => ({
            id: l.id,
            user_id: l.userId,
            manga_id: l.mangaId,
            username: l.username,
            avatar_url: l.avatarUrl,
            content: l.content,
            spoiler: l.isSpoiler,
            created_at: new Date(l.createdAt).toISOString(),
          }))
        );
      } else {
        // Initial sample seed comments for manga community feeling if empty
        const initialSample: CloudComment = {
          id: `sample-comment-${mangaId}`,
          user_id: "system-bot",
          manga_id: mangaId,
          username: "VoidCommunity",
          avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=VoidCommunity",
          content: `Selamat datang di ruang diskusi ${mangaTitle || "komik ini"}! Bagikan pendapat, teori, dan ulasan Anda di sini. Harap gunakan fitur spoiler jika membicarakan chapter terbaru.`,
          spoiler: false,
          created_at: new Date().toISOString(),
        };
        setComments([initialSample]);
      }
    } catch (err) {
      console.error("Error loading comments:", err);
    } finally {
      setLoading(false);
    }
  }, [mangaId, mangaTitle]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // 2. Add Comment
  const handleAddComment = async (content: string, isSpoiler: boolean): Promise<boolean> => {
    if (!currentUser) return false;

    const newCommentId = "comment-" + Date.now();
    const newComment: CloudComment = {
      id: newCommentId,
      user_id: currentUser.id,
      manga_id: mangaId,
      username: currentUser.username,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`,
      content,
      spoiler: isSpoiler,
      created_at: new Date().toISOString(),
    };

    // Save locally in Dexie IndexedDB
    try {
      await db.comments.put({
        id: newComment.id,
        mangaId: newComment.manga_id,
        userId: newComment.user_id,
        username: newComment.username,
        avatarUrl: newComment.avatar_url,
        content: newComment.content,
        isSpoiler: newComment.spoiler,
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error("Local comment save error:", e);
    }

    // Save in Supabase if connected
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("comments").insert({
        id: newComment.id,
        user_id: newComment.user_id,
        manga_id: newComment.manga_id,
        username: newComment.username,
        avatar_url: newComment.avatar_url,
        content: newComment.content,
        spoiler: newComment.spoiler,
      });
    }

    setComments((prev) => [newComment, ...prev]);
    return true;
  };

  // 3. Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await db.comments.delete(commentId);
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from("comments").delete().eq("id", commentId);
      }
    } catch (e) {
      console.error("Error deleting comment:", e);
    }
  };

  // 4. Edit Comment
  const handleEditComment = async (commentId: string, newContent: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, content: newContent } : c))
    );
    try {
      const local = await db.comments.get(commentId);
      if (local) {
        await db.comments.put({ ...local, content: newContent, updatedAt: Date.now() });
      }
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from("comments").update({ content: newContent }).eq("id", commentId);
      }
    } catch (e) {
      console.error("Error editing comment:", e);
    }
  };

  return (
    <section className="bg-[#111827] rounded-3xl border border-white/5 p-6 sm:p-8 shadow-2xl mt-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-[#00E5FF]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Komentar Pembaca</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                {comments.length}
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Diskusikan alur cerita dan teori bersama komunitas Void Reader
            </p>
          </div>
        </div>

        <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          Komunitas Terbuka
        </span>
      </div>

      {/* Input Box */}
      <CommentInput
        isLoggedIn={Boolean(currentUser)}
        username={currentUser?.username}
        onSubmit={handleAddComment}
      />

      {/* Comments List */}
      <div className="space-y-3 pt-2">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUser?.id}
            onDelete={handleDeleteComment}
            onEdit={handleEditComment}
          />
        ))}
      </div>
    </section>
  );
};
