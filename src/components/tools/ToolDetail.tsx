"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ToolDefinition, ToolCategory } from "@/lib/tools/types";
import { ToolCategoryBadge } from "./ToolCategoryBadge";
import { ToolIcon } from "./ToolIcon";
import { ToolRunner } from "./ToolRunner";
import { ToolCard } from "./ToolCard";
import { ApiConfigModal } from "./ApiConfigModal";
import { toggleFavoriteTool } from "@/lib/tools/storage";
import {
  ChevronRight,
  Star,
  Share2,
  Key,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Sliders,
} from "lucide-react";

interface ToolDetailProps {
  tool: ToolDefinition;
  category: ToolCategory;
  relatedTools: ToolDefinition[];
  isFavorite?: boolean;
}

export const ToolDetail: React.FC<ToolDetailProps> = ({
  tool,
  category,
  relatedTools,
  isFavorite = false,
}) => {
  const [favorite, setFavorite] = useState(isFavorite);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleFavoriteClick = () => {
    const next = toggleFavoriteTool(tool.id);
    setFavorite(next);
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 font-mono overflow-x-auto no-scrollbar">
        <Link href="/settings" className="hover:text-cyan-400 transition-colors">
          Pengaturan
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        <Link href="/settings/tools" className="hover:text-cyan-400 transition-colors">
          Void Tools
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        <Link
          href={`/settings/tools?category=${category.id}`}
          className="hover:text-cyan-400 transition-colors"
        >
          {category.name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        <span className="text-[#00E5FF] font-semibold truncate">{tool.name}</span>
      </nav>

      {/* Hero Header Card */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-[#111827] border border-cyan-500/20 shadow-2xl overflow-hidden">
        {/* Glow Ambient Backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF] shadow-[0_0_25px_rgba(0,229,255,0.25)] shrink-0">
              <ToolIcon name={tool.iconName} className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <ToolCategoryBadge categoryId={tool.categoryId} />
                {tool.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]">
                    {tool.badge}
                  </span>
                )}
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Siap Digunakan</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {tool.name}
              </h1>
              <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                {tool.longDescription || tool.description}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {tool.requiresApiKey && (
              <button
                onClick={() => setApiModalOpen(true)}
                title="Atur Kunci API Eksternal"
                className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                <Key className="w-4 h-4" />
                <span className="hidden sm:inline">Konfigurasi API</span>
              </button>
            )}

            <button
              onClick={handleFavoriteClick}
              title={favorite ? "Hapus dari Favorit" : "Simpan ke Favorit"}
              className={`p-3 rounded-xl border transition-all ${
                favorite
                  ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                  : "bg-[#080B14] border-white/5 text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <Star className={`w-4 h-4 ${favorite ? "fill-yellow-400" : ""}`} />
            </button>

            <button
              onClick={handleShare}
              title="Salin Tautan Alat"
              className="p-3 rounded-xl bg-[#080B14] border border-white/5 text-gray-400 hover:text-white hover:border-gray-700 transition-all text-xs flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              {copiedShare && <span className="text-emerald-400 text-[10px]">Tersalin!</span>}
            </button>
          </div>
        </div>

        {/* Tags bar */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-mono">Kemampuan:</span>
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-lg bg-[#080B14] border border-white/5 text-xs text-cyan-300 font-mono"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Interactive Tool Runner Execution Core */}
      <div>
        <ToolRunner tool={tool} onOpenApiConfig={() => setApiModalOpen(true)} />
      </div>

      {/* Related Tools in same Category */}
      {relatedTools.length > 0 && (
        <section className="pt-8 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00E5FF]" />
              <span>Alat Lain di {category.name}</span>
            </h3>
            <Link
              href={`/settings/tools?category=${category.id}`}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Lihat Semua ({category.toolCount}) ➜
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedTools.slice(0, 3).map((rt) => (
              <ToolCard key={rt.id} tool={rt} />
            ))}
          </div>
        </section>
      )}

      {/* API Configuration Modal */}
      <ApiConfigModal
        isOpen={apiModalOpen}
        onClose={() => setApiModalOpen(false)}
        defaultProvider={tool.requiresApiKey || "openai"}
      />
    </div>
  );
};
