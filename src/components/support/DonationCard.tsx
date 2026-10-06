"use client";

import React from "react";
import { MONETIZATION_CONFIG } from "@/config/monetization";
import { Heart, ExternalLink, Coffee } from "lucide-react";

interface DonationCardProps {
  className?: string;
}

export const DonationCard: React.FC<DonationCardProps> = ({ className = "" }) => {
  const config = MONETIZATION_CONFIG.donation;

  if (!config.enabled) return null;

  return (
    <section aria-label="Donasi Pengembang" className={`w-full my-8 ${className}`}>
      <div className="relative w-full rounded-2xl overflow-hidden bg-[#111827] border border-white/10 hover:border-pink-500/40 shadow-xl transition-all duration-300 p-6 sm:p-7 group">
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          {/* Content Area */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(236,72,153,0.2)] group-hover:scale-105 group-hover:border-pink-400 transition-all">
              <Heart className="w-6 h-6 text-pink-400 fill-pink-400/20 group-hover:fill-pink-400 transition-colors" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/30">
                  {config.provider}
                </span>
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Coffee className="w-3 h-3 text-amber-400" />
                  Dukungan Server & Pengembangan
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {config.title}
              </h3>

              <p className="text-xs sm:text-sm text-gray-400 mt-0.5 max-w-xl leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
            <a
              href={config.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] hover:scale-105 active:scale-95 transition-all"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>{config.buttonText}</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DonationCard;
