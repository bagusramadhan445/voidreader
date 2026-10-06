"use client";

import React from "react";
import { MONETIZATION_CONFIG } from "@/config/monetization";
import { Gamepad2, Zap, ExternalLink, ShieldCheck } from "lucide-react";

interface TopupBannerProps {
  className?: string;
  variant?: "full" | "compact";
}

export const TopupBanner: React.FC<TopupBannerProps> = ({
  className = "",
  variant = "full",
}) => {
  const config = MONETIZATION_CONFIG.topup;

  if (!config.enabled) return null;

  return (
    <aside aria-label="Promosi Top Up Game" className={`w-full my-8 ${className}`}>
      <a
        href={config.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block w-full rounded-2xl overflow-hidden bg-gradient-to-r from-[#0c101c] via-[#111827] to-[#0c101c] border border-cyan-500/25 hover:border-[#00E5FF]/60 shadow-[0_0_20px_rgba(0,229,255,0.08)] hover:shadow-[0_0_35px_rgba(0,229,255,0.22)] transition-all duration-300 transform hover:-translate-y-0.5"
      >
        {/* Optional custom banner image from admin config */}
        {config.bannerImage ? (
          <img
            src={config.bannerImage}
            alt={config.title}
            className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity"
          />
        ) : null}

        {/* Futuristic glowing ambient background */}
        <div className="absolute inset-0 bg-radial-at-c from-cyan-500/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 px-5 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left info area */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Glowing Icon Shield */}
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.25)] group-hover:scale-105 group-hover:border-[#00E5FF] transition-all">
              <Gamepad2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#00E5FF] group-hover:rotate-6 transition-transform" />
              <div className="absolute -bottom-1 -right-1 p-0.5 bg-[#080B14] rounded-full border border-cyan-500/40">
                <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              </div>
            </div>

            {/* Texts */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-[#00E5FF] border border-cyan-500/30">
                  {config.badge || "Partner Resmi"}
                </span>
                <span className="hidden xs:flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Instan 24 Jam
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 group-hover:text-[#00E5FF] transition-colors">
                <span>{config.title}</span>
                <span className="text-xs font-mono font-normal text-cyan-400/80">
                  .my.id
                </span>
              </h3>

              <p className="text-xs sm:text-sm text-gray-300 font-medium truncate mt-0.5">
                {config.subtitle}
              </p>
            </div>
          </div>

          {/* Right Action Button */}
          <div className="w-full sm:w-auto flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
            <span className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-[#00E5FF] text-[#080B14] font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,229,255,0.4)] group-hover:shadow-[0_0_30px_rgba(0,229,255,0.7)] group-hover:scale-105 active:scale-95 transition-all">
              <span>{config.buttonText}</span>
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
            </span>
          </div>
        </div>
      </a>
    </aside>
  );
};

export default TopupBanner;
