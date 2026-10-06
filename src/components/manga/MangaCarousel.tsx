"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { MangaItem } from "@/lib/sources";
import { MangaCard } from "./MangaCard";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface MangaCarouselProps {
  title?: string;
  subtitle?: string;
  items: MangaItem[];
  viewAllHref?: string;
  icon?: React.ReactNode;
}

export const MangaCarousel: React.FC<MangaCarouselProps> = ({
  title,
  subtitle,
  items,
  viewAllHref,
  icon,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollAmount = clientWidth * 0.75;
    scrollRef.current.scrollTo({
      left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: "smooth",
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="my-8 relative group">
      {/* Header Bar */}
      {title && (
        <div className="flex items-end justify-between mb-4 px-1">
          <div>
            <div className="flex items-center gap-2">
              {icon && <span className="text-[#00E5FF]">{icon}</span>}
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="text-xs sm:text-sm font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:gap-1.5 transition-all mr-2"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            {/* Carousel Arrows */}
            <button
              onClick={() => handleScroll("left")}
              aria-label="Scroll left"
              className="hidden sm:flex w-8 h-8 rounded-full bg-[#111827] border border-gray-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 items-center justify-center text-gray-300 hover:text-[#00E5FF] transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              aria-label="Scroll right"
              className="hidden sm:flex w-8 h-8 rounded-full bg-[#111827] border border-gray-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 items-center justify-center text-gray-300 hover:text-[#00E5FF] transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {items.map((manga) => (
          <div key={manga.id} className="shrink-0 w-36 sm:w-44 md:w-52 lg:w-56">
            <MangaCard manga={manga} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default MangaCarousel;
