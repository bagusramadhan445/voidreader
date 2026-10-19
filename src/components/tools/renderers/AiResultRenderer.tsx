"use client";

import React from "react";
import {
  Bot,
  Sparkles,
  Download,
  Copy,
  Image as ImageIcon,
  MessageSquare,
  Volume2,
} from "lucide-react";
import {
  MetricPill,
  ResultSectionTitle,
  CopyButton,
  VisualCodeBlock,
} from "./SharedComponents";

interface AiResultRendererProps {
  toolId: string;
  output: any;
  metadata?: any;
}

export const AiResultRenderer: React.FC<AiResultRendererProps> = ({
  toolId,
  output,
  metadata,
}) => {
  // -------------------------------------------------------------------
  // 1. AI IMAGE GENERATOR & ENHANCER
  // -------------------------------------------------------------------
  if (["ai-image-generator", "ai-image-enhancer"].includes(toolId)) {
    const imgUrl = typeof output === "string" ? output : metadata?.downloadUrl;

    return (
      <div className="space-y-6 max-w-lg mx-auto text-center">
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0c1427] to-[#111827] border border-cyan-500/30 shadow-[0_0_35px_rgba(0,229,255,0.15)] space-y-5">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/20">
              {toolId === "ai-image-generator" ? "Karya Visual AI Selesai" : "Resolusi Gambar Ditingkatkan"}
            </span>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/50 aspect-square flex items-center justify-center shadow-2xl">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt="AI Artwork"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-gray-400 text-xs font-mono">Gambar tidak tersedia</div>
            )}
          </div>

          {imgUrl && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <a
                href={imgUrl}
                download="void-verse-ai-artwork.png"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Karya Visual</span>
              </a>
              <CopyButton text={imgUrl} label="Salin Tautan" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 2. AI TEXT TOOLS (Chat, Summarizer, Translator, etc.)
  // -------------------------------------------------------------------
  const text = typeof output === "string" ? output : JSON.stringify(output, null, 2);
  const words = text.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="p-5 sm:p-6 rounded-2xl bg-[#080B14] border border-cyan-500/20 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#00E5FF]" />
            <h3 className="text-sm font-bold text-white">Respon Kecerdasan Buatan (Void AI)</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400">
              {words} Kata
            </span>
          </div>
          <CopyButton text={text} label="Salin Teks" />
        </div>

        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-gray-200 leading-relaxed space-y-3 font-sans whitespace-pre-wrap">
          {text}
        </div>
      </div>
    </div>
  );
};
