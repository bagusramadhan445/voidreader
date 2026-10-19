"use client";

import React, { useState } from "react";
import { Copy, Check, Download, ExternalLink, LucideIcon } from "lucide-react";

/**
 * Reusable Copy Button with visual feedback
 */
export const CopyButton: React.FC<{
  text: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}> = ({ text, label = "Salin", className = "", size = "sm" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSmall = size === "sm";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border transition-all ${
        copied
          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
          : "bg-[#080B14] hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
      } ${isSmall ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs font-semibold"} ${className}`}
      title={copied ? "Tersalin ke clipboard!" : `Salin ${label}`}
    >
      {copied ? (
        <>
          <Check className={isSmall ? "w-3 h-3 text-emerald-400" : "w-3.5 h-3.5 text-emerald-400"} />
          <span className="text-emerald-400 font-medium">Tersalin!</span>
        </>
      ) : (
        <>
          <Copy className={isSmall ? "w-3 h-3 text-gray-400" : "w-3.5 h-3.5 text-gray-400"} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

/**
 * Metric Card for numeric or compact stats
 */
export const MetricPill: React.FC<{
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: "cyan" | "emerald" | "amber" | "purple" | "rose" | "gray";
}> = ({ label, value, icon: Icon, variant = "cyan" }) => {
  const variantStyles = {
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-[#00E5FF]",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    gray: "bg-white/5 border-white/10 text-gray-300",
  };

  return (
    <div
      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${variantStyles[variant]}`}
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium truncate">
          {label}
        </p>
        <p className="text-sm sm:text-base font-bold font-mono text-white truncate">{value}</p>
      </div>
      {Icon && <Icon className="w-4 h-4 shrink-0 opacity-80" />}
    </div>
  );
};

/**
 * Section Title with Icon
 */
export const ResultSectionTitle: React.FC<{
  title: string;
  icon?: LucideIcon;
  count?: number;
  action?: React.ReactNode;
}> = ({ title, icon: Icon, count, action }) => (
  <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-[#00E5FF]" />}
      <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
      {count !== undefined && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-[#00E5FF] border border-cyan-500/30">
          {count}
        </span>
      )}
    </div>
    {action && <div>{action}</div>}
  </div>
);

/**
 * Key-Value Property Row
 */
export const PropertyRow: React.FC<{
  label: string;
  value?: React.ReactNode;
  canCopy?: boolean;
  copyValue?: string;
}> = ({ label, value, canCopy = false, copyValue }) => {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] border-b border-white/5 last:border-0 gap-1.5 sm:gap-4 text-xs">
      <span className="text-gray-400 shrink-0 font-medium">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <div className="text-gray-200 font-mono break-all sm:text-right">{value}</div>
        {canCopy && (
          <CopyButton text={copyValue || String(value)} label="Salin" size="sm" />
        )}
      </div>
    </div>
  );
};

/**
 * Code Block with Language & Copy
 */
export const VisualCodeBlock: React.FC<{
  code: string;
  language?: string;
  title?: string;
  maxHeight?: string;
}> = ({ code, language = "text", title, maxHeight = "max-h-96" }) => {
  return (
    <div className="rounded-xl border border-white/10 bg-[#080B14] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#0c101d] border-b border-white/5">
        <span className="text-[11px] font-mono text-cyan-400 font-semibold uppercase">
          {title || language}
        </span>
        <CopyButton text={code} label="Salin Kode" size="sm" />
      </div>
      <pre
        className={`p-4 text-xs font-mono leading-relaxed text-cyan-200 overflow-x-auto whitespace-pre-wrap ${maxHeight}`}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};
