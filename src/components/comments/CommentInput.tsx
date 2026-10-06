"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Send, AlertTriangle, LogIn } from "lucide-react";

interface CommentInputProps {
  isLoggedIn: boolean;
  username?: string;
  onSubmit: (content: string, isSpoiler: boolean) => Promise<boolean>;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  isLoggedIn,
  username,
  onSubmit,
}) => {
  const [content, setContent] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    try {
      setSubmitting(true);
      const success = await onSubmit(content.trim(), isSpoiler);
      if (success) {
        setContent("");
        setIsSpoiler(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          Masuk ke akun Anda untuk ikut berdiskusi dan mengirim komentar.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-bold text-xs transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)] shrink-0"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Masuk untuk Berkomentar</span>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Tulis tanggapan Anda sebagai ${username || "Pembaca"}...`}
          rows={3}
          maxLength={1000}
          className="w-full bg-[#080B14] text-xs sm:text-sm text-gray-100 placeholder-gray-500 p-3.5 rounded-2xl border border-gray-800 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 transition-all resize-none"
        />
        <div className="absolute right-3 bottom-3 text-[10px] text-gray-500 font-mono">
          {content.length}/1000
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Spoiler Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-400 hover:text-white">
          <input
            type="checkbox"
            checked={isSpoiler}
            onChange={(e) => setIsSpoiler(e.target.checked)}
            className="w-4 h-4 rounded accent-[#00E5FF] cursor-pointer"
          />
          <span className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Tandai sebagai Spoiler
          </span>
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-[#00E5FF] text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_20px_rgba(0,229,255,0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{submitting ? "Mengirim..." : "Kirim Komentar"}</span>
        </button>
      </div>
    </form>
  );
};
