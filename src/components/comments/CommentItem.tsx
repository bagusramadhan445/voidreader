"use client";

import React, { useState } from "react";
import { CloudComment } from "@/lib/supabase/types";
import { AlertTriangle, Eye, Trash2, Edit3, Check, X } from "lucide-react";

interface CommentItemProps {
  comment: CloudComment;
  currentUserId?: string | null;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newContent: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onDelete,
  onEdit,
}) => {
  const [revealedSpoiler, setRevealedSpoiler] = useState(!comment.spoiler);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);

  const isAuthor = Boolean(currentUserId && currentUserId === comment.user_id);

  const handleSaveEdit = () => {
    if (onEdit && editedContent.trim()) {
      onEdit(comment.id, editedContent.trim());
      setIsEditing(false);
    }
  };

  const formattedDate = new Date(comment.created_at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 hover:border-cyan-500/30 transition-all space-y-2.5 group">
      {/* Author Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src={
              comment.avatar_url ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.username}`
            }
            alt={comment.username}
            className="w-8 h-8 rounded-full bg-gray-800 border border-cyan-500/30 object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{comment.username}</span>
              {comment.spoiler && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Spoiler
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">{formattedDate}</span>
          </div>
        </div>

        {/* Action Controls for Author */}
        {isAuthor && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-white/5"
              title="Edit Komentar"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete && onDelete(comment.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5"
              title="Hapus Komentar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      {isEditing ? (
        <div className="space-y-2 pt-1">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full bg-[#111827] text-xs text-gray-100 p-2.5 rounded-xl border border-cyan-500/40 focus:outline-none"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-[11px] flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Batal
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-2.5 py-1 rounded-lg bg-[#00E5FF] text-black font-bold text-[11px] flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Simpan
            </button>
          </div>
        </div>
      ) : comment.spoiler && !revealedSpoiler ? (
        /* Masked Spoiler Banner */
        <div
          onClick={() => setRevealedSpoiler(true)}
          className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center cursor-pointer hover:bg-amber-500/15 transition-all group/sp"
        >
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Komentar Ini Mengandung Spoiler</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-center gap-1">
            <Eye className="w-3 h-3" />
            <span>Klik untuk membuka isi komentar</span>
          </p>
        </div>
      ) : (
        /* Clear Text Content */
        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
          {comment.content}
        </p>
      )}
    </div>
  );
};
