"use client";

import React from "react";
import { ToolCategoryId } from "@/lib/tools/types";
import { ToolIcon } from "./ToolIcon";

interface ToolCategoryBadgeProps {
  categoryId: ToolCategoryId;
  showIcon?: boolean;
  className?: string;
}

const CATEGORY_STYLES: Record<
  ToolCategoryId,
  { label: string; icon: string; classes: string; textClass: string }
> = {
  ai: {
    label: "Void AI",
    icon: "Bot",
    classes: "bg-cyan-500/15 border-cyan-500/30 text-[#00E5FF]",
    textClass: "text-[#00E5FF]",
  },
  downloader: {
    label: "Void Downloader",
    icon: "Download",
    classes: "bg-sky-500/15 border-sky-500/30 text-sky-400",
    textClass: "text-sky-400",
  },
  scraper: {
    label: "Void Scraper",
    icon: "Globe",
    classes: "bg-purple-500/15 border-purple-500/30 text-purple-400",
    textClass: "text-purple-400",
  },
  forge: {
    label: "Void Forge",
    icon: "Wrench",
    classes: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    textClass: "text-amber-400",
  },
  document: {
    label: "Void Document",
    icon: "FileText",
    classes: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    textClass: "text-emerald-400",
  },
  developer: {
    label: "Void Developer",
    icon: "Terminal",
    classes: "bg-pink-500/15 border-pink-500/30 text-pink-400",
    textClass: "text-pink-400",
  },
};

export const ToolCategoryBadge: React.FC<ToolCategoryBadgeProps> = ({
  categoryId,
  showIcon = true,
  className = "",
}) => {
  const meta = CATEGORY_STYLES[categoryId] || CATEGORY_STYLES.ai;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md tracking-wider uppercase ${meta.classes} ${className}`}
    >
      {showIcon && <ToolIcon name={meta.icon} className="w-3 h-3" />}
      <span>{meta.label}</span>
    </span>
  );
};
