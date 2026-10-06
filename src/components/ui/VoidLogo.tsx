import React from "react";

interface VoidLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const VoidLogo: React.FC<VoidLogoProps> = ({ size = "md", showText = true }) => {
  const sizeMap = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
  };

  const textMap = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-2.5 group cursor-pointer select-none">
      {/* Void Portal Symbol */}
      <div className={`relative ${sizeMap[size]} flex items-center justify-center`}>
        {/* Outer glowing pulsating energy halo */}
        <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-md group-hover:bg-cyan-400/35 transition-all duration-500 animate-pulse" />

        {/* Portal Ring */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full relative z-10 drop-shadow-[0_0_10px_rgba(0,229,255,0.7)] group-hover:rotate-45 transition-transform duration-700 ease-out"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="portalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E5FF" />
              <stop offset="50%" stopColor="#7928CA" />
              <stop offset="100%" stopColor="#00E5FF" />
            </linearGradient>
            <radialGradient id="singularityGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="70%" stopColor="#080B14" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.4" />
            </radialGradient>
          </defs>

          {/* Outer Ring */}
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#portalGrad)"
            strokeWidth="4"
            strokeDasharray="12 6 24 6"
          />

          {/* Inner Orbital Orbit */}
          <circle
            cx="50"
            cy="50"
            r="32"
            stroke="#00E5FF"
            strokeWidth="2"
            strokeOpacity="0.7"
            strokeDasharray="4 8"
          />

          {/* Singularity / Black Hole Core */}
          <circle cx="50" cy="50" r="22" fill="url(#singularityGrad)" />

          {/* Energy core diamond */}
          <polygon
            points="50,38 60,50 50,62 40,50"
            fill="#00E5FF"
            className="group-hover:scale-110 transition-transform origin-center"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-black tracking-wider ${textMap[size]} text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400 group-hover:to-cyan-300 transition-colors`}
          >
            VOID<span className="text-[#00E5FF] ml-1 text-glow">READER</span>
          </span>
          <span className="text-[10px] tracking-widest text-cyan-400/80 -mt-1 font-mono uppercase">
            Portal Manga ID
          </span>
        </div>
      )}
    </div>
  );
};
