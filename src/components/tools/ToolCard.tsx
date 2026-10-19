"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ToolDefinition } from "@/lib/tools/types";
import { ToolCategoryBadge } from "./ToolCategoryBadge";
import { ToolIcon } from "./ToolIcon";
import { toggleFavoriteTool } from "@/lib/tools/storage";
import { Star, ArrowRight, Sparkles, Key } from "lucide-react";

interface ToolCardProps {
  tool: ToolDefinition;
  isFavorite?: boolean;
  onFavoriteToggle?: (toolId: string, isFav: boolean) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isFavorite = false,
  onFavoriteToggle,
}) => {
  const [favorite, setFavorite] = useState(isFavorite);

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = toggleFavoriteTool(tool.id);
    setFavorite(nextState);
    if (onFavoriteToggle) {
      onFavoriteToggle(tool.id, nextState);
    }
  };

  return (
    <Link
      href={`/settings/tools/${tool.id}`}
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#111827]/90 hover:bg-[#111827] border border-white/5 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,229,255,0.12)] focus:outline-none"
    >
      {/* Top Bar: Icon + Category Badge + Favorite Star */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00E5FF] group-hover:bg-cyan-500/20 group-hover:scale-105 transition-all shadow-[0_0_12px_rgba(0,229,255,0.15)]">
              <ToolIcon name={tool.iconName} className="w-5 h-5" />
            </div>
            <div>
              <ToolCategoryBadge categoryId={tool.categoryId} />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {tool.badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,229,255,0.4)]">
                {tool.badge}
              </span>
            )}
            <button
              onClick={handleStarClick}
              title={favorite ? "Hapus dari Favorit" : "Tambah ke Favorit"}
              className={`p-1.5 rounded-lg border transition-all ${
                favorite
                  ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.3)]"
                  : "bg-white/5 border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/10"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${favorite ? "fill-yellow-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-white group-hover:text-[#00E5FF] transition-colors leading-snug mb-1.5">
          {tool.name}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4">
          {tool.description}
        </p>
      </div>

      {/* Footer: Tags & Launch Action */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tool.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md bg-[#080B14] border border-white/5 text-[10px] text-gray-400 font-mono"
            >
              #{tag}
            </span>
          ))}
          {tool.requiresApiKey && (
            <span
              title="Mendukung API Key eksternal"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono border border-amber-500/20"
            >
              <Key className="w-2.5 h-2.5" />
              <span>API</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all">
          <span>Buka</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
};
