"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MangaItem } from "@/lib/sources";
import { normalizeImageUrl } from "@/lib/image-utils";
import { Play, Info, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface HeroBannerProps {
  items: MangaItem[];
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = items && items.length > 0 ? items[currentIndex] : null;

  const rawHeroImage = normalizeImageUrl(
    current?.banner ||
    current?.cover ||
    current?.thumbnail ||
    current?.poster
  );
  const [heroImage, setHeroImage] = useState(rawHeroImage);
  const [hasProxied, setHasProxied] = useState(false);

  useEffect(() => {
    setHeroImage(rawHeroImage);
    setHasProxied(false);
  }, [rawHeroImage]);

  useEffect(() => {
    if (!items || items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [items]);

  if (!items || items.length === 0 || !current) return null;

  const handleImageError = () => {
    if (!hasProxied && rawHeroImage && !rawHeroImage.startsWith("/") && !rawHeroImage.startsWith("/placeholder")) {
      setHasProxied(true);
      setHeroImage(`/api/proxy/image?url=${encodeURIComponent(rawHeroImage)}`);
    } else {
      setHeroImage("/placeholder.jpg");
    }
  };

  // Debug log required by spec
  console.log("MANGA IMAGE:", {
    title: current.title,
    cover: heroImage,
  });

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div className="relative w-full h-[460px] md:h-[520px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-8 group">
      {/* Dynamic Background Backdrop */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt={current.title || "Banner Manga"}
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className="w-full h-full object-cover object-center opacity-60 md:opacity-75 transition-all duration-700 ease-out"
        />
        {/* Void overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080B14] via-[#080B14]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080B14] via-[#080B14]/70 to-transparent" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full h-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col justify-end pb-10 md:pb-14">
        <div className="max-w-2xl">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/40 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-[#00E5FF]" />
              Trending Hari Ini
            </span>
            {current.type && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-gray-200 border border-white/10 backdrop-blur-md uppercase">
                {current.type}
              </span>
            )}
            {current.latestChapter && (
              <span className="text-xs font-mono text-cyan-300 px-2 py-0.5 rounded-full bg-[#111827]/80 border border-cyan-500/30">
                {current.latestChapter.replace(/Terbaru:\s*/i, "")}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
            {current.title}
          </h1>

          {/* Synopsis / Blurb */}
          <p className="mt-2.5 text-sm md:text-base text-gray-300 line-clamp-2 md:line-clamp-3 leading-relaxed max-w-xl">
            {current.synopsis ||
              current.updatedAt ||
              "Baca kelanjutan kisah menarik manga Bahasa Indonesia terlengkap hanya di Void Reader."}
          </p>

          {/* CTA Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={current.sourceId ? `/manga/${current.id}?source=${current.sourceId}` : `/manga/${current.id}`}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-[#00E5FF] text-[#080B14] font-bold text-sm hover:shadow-[0_0_25px_rgba(0,229,255,0.6)] hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Mulai Baca</span>
            </Link>

            <Link
              href={current.sourceId ? `/manga/${current.id}?source=${current.sourceId}` : `/manga/${current.id}`}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#111827]/80 hover:bg-[#161F38] text-gray-200 hover:text-white font-medium text-sm border border-white/10 hover:border-cyan-500/40 backdrop-blur-md transition-all duration-200"
            >
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Detail Info</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Slide Navigation Buttons */}
      <button
        onClick={handlePrev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 hover:border-cyan-500/50 flex items-center justify-center text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={handleNext}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 hover:border-cyan-500/50 flex items-center justify-center text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Slide Dots Indicator */}
      <div className="absolute bottom-4 right-6 md:right-12 z-20 flex items-center gap-1.5">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? "w-6 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]"
                : "w-1.5 bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
