"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MangaItem } from "@/lib/sources";
import { normalizeImageUrl } from "@/lib/image-utils";
import { Sparkles } from "lucide-react";

interface MangaCardProps {
  manga: MangaItem;
  priority?: boolean;
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga }) => {
  const rawCoverImage = normalizeImageUrl(
    manga.cover ||
    manga.thumbnail ||
    manga.poster ||
    manga.banner
  );
  const [imgSrc, setImgSrc] = useState(rawCoverImage);
  const [hasProxied, setHasProxied] = useState(false);

  useEffect(() => {
    setImgSrc(rawCoverImage);
    setHasProxied(false);
  }, [rawCoverImage]);

  const handleImageError = () => {
    if (!hasProxied && rawCoverImage && !rawCoverImage.startsWith("/") && !rawCoverImage.startsWith("/placeholder")) {
      setHasProxied(true);
      setImgSrc(`/api/proxy/image?url=${encodeURIComponent(rawCoverImage)}`);
    } else {
      setImgSrc("/placeholder.jpg");
    }
  };

  // Debug log required by spec
  console.log("MANGA IMAGE:", {
    title: manga.title,
    cover: imgSrc,
  });

  // Type-specific badge colors
  const getTypeColor = (type?: string) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("webtoon")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    if (t.includes("manhwa")) return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
    if (t.includes("manhua")) return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    return "bg-rose-500/20 text-rose-300 border-rose-500/40"; // Manga default
  };

  return (
    <Link
      href={manga.sourceId ? `/manga/${manga.id}?source=${manga.sourceId}` : `/manga/${manga.id}`}
      className="group relative flex flex-col bg-[#111827] rounded-xl overflow-hidden border border-white/5 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(0,229,255,0.15)] focus:outline-none"
    >
      {/* Poster Aspect Container */}
      <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-[#0c101c]">
        {/* Glow backdrop behind image on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent z-10 opacity-70 group-hover:opacity-40 transition-opacity" />

        <img
          src={imgSrc}
          alt={manga.title || "Manga Cover"}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between gap-1 pointer-events-none">
          {manga.type && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border backdrop-blur-md shadow-sm uppercase tracking-wider ${getTypeColor(
                manga.type
              )}`}
            >
              {manga.type}
            </span>
          )}

          {manga.rating && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 backdrop-blur-md flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
              {manga.rating}
            </span>
          )}
        </div>

        {/* Bottom Chapter Badge */}
        {manga.latestChapter && (
          <div className="absolute bottom-2 left-2 right-2 z-20 pointer-events-none">
            <span className="inline-block text-[11px] font-medium text-cyan-200 px-2 py-0.5 rounded-md bg-[#080B14]/85 backdrop-blur-md border border-cyan-500/20 line-clamp-1">
              {manga.latestChapter.replace(/Terbaru:\s*/i, "")}
            </span>
          </div>
        )}
      </div>

      {/* Card Metadata Details */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <h3
          title={manga.title}
          className="text-sm font-semibold text-gray-100 group-hover:text-[#00E5FF] transition-colors line-clamp-2 leading-snug"
        >
          {manga.title}
        </h3>

        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
          <span className="truncate max-w-[120px]">
            {manga.genres && manga.genres.length > 0
              ? manga.genres[0]
              : manga.status || "Bahasa Indonesia"}
          </span>
          {manga.updatedAt && (
            <span className="text-gray-500 shrink-0 text-[10px]">{manga.updatedAt}</span>
          )}
        </div>
      </div>
    </Link>
  );
};
