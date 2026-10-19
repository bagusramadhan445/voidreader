"use client";

import React, { useState } from "react";
import {
  Download,
  ExternalLink,
  Copy,
  Check,
  Play,
  Film,
  Music,
  HardDrive,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Layers,
  Clock,
  User,
  Share2,
  BookOpen,
  Image as ImageIcon,
  FileDown,
  FolderDown,
  FileText,
  ListChecks,
} from "lucide-react";

export interface DownloaderCardQuality {
  label: string;
  url: string;
  quality?: string;
  format?: string;
  sizeFormatted?: string;
}

export interface NormalizedDownloaderData {
  platform: string;
  title: string;
  author?: string;
  thumbnail?: string;
  duration?: string | number;
  qualities: DownloaderCardQuality[];
  audioUrl?: string;
  sourceUrl?: string;
  fileName?: string;
}

interface DownloaderResultCardProps {
  data: any;
}

export function isDownloaderResult(output: any): boolean {
  if (!output || typeof output !== "object") return false;

  // Pattern 1: Standard DownloaderResult from adapter
  if (Array.isArray(output.qualities) && output.qualities.length > 0) {
    return true;
  }

  // Pattern 2: Direct media inspection result
  if (output.directDownloadUrl || (output.finalUrl && output.mediaType)) {
    return true;
  }

  // Pattern 3: Streams array
  if (Array.isArray(output.streams) && output.streams.length > 0) {
    return true;
  }

  return false;
}

export function normalizeDownloaderData(raw: any): NormalizedDownloaderData {
  const qualities: DownloaderCardQuality[] = [];

  // Parse streams / qualities
  if (Array.isArray(raw.qualities)) {
    for (const q of raw.qualities) {
      if (q.url) {
        qualities.push({
          label: q.label || "Stream Direct",
          url: q.url,
          quality: q.quality,
          format: q.format || "mp4",
          sizeFormatted: q.sizeFormatted,
        });
      }
    }
  } else if (Array.isArray(raw.streams)) {
    for (const s of raw.streams) {
      if (s.directLink || s.url) {
        qualities.push({
          label: s.resolution || s.label || "Direct Stream",
          url: s.directLink || s.url,
          format: s.format || "mp4",
          sizeFormatted: s.bitrate,
        });
      }
    }
  }

  // If no qualities but directDownloadUrl exists
  if (qualities.length === 0 && (raw.directDownloadUrl || raw.finalUrl)) {
    qualities.push({
      label: raw.fileSize ? `Unduh Penuh (${raw.fileSize})` : "Unduh Langsung",
      url: raw.directDownloadUrl || raw.finalUrl,
      format: raw.fileName?.split(".").pop() || "bin",
      sizeFormatted: raw.fileSize,
    });
  }

  // Format duration if numeric
  let durationStr = raw.duration;
  if (typeof raw.duration === "number") {
    const mins = Math.floor(raw.duration / 60);
    const secs = raw.duration % 60;
    durationStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return {
    platform: raw.platform || "Media Stream",
    title: raw.title || raw.pageTitle || raw.fileName || "Media Berhasil Diekstrak",
    author: raw.author,
    thumbnail: raw.thumbnail || raw.cover,
    duration: durationStr,
    qualities,
    audioUrl: raw.audioUrl,
    sourceUrl: raw.sourceUrl || raw.url,
    fileName: raw.fileName,
  };
}

export const DownloaderResultCard: React.FC<DownloaderResultCardProps> = ({ data }) => {
  const normalized = normalizeDownloaderData(data);
  const [selectedQualityIndex, setSelectedQualityIndex] = useState(0);
  const [downloadState, setDownloadState] = useState<
    "ready" | "downloading" | "completed" | "failed"
  >("ready");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const selectedStream =
    normalized.qualities[selectedQualityIndex] || normalized.qualities[0];

  const handleCopyLink = () => {
    if (!selectedStream?.url) return;
    navigator.clipboard.writeText(selectedStream.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = () => {
    if (!selectedStream?.url) return;

    setDownloadState("downloading");

    try {
      // Create hidden anchor to initiate browser download
      const a = document.createElement("a");
      a.href = selectedStream.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";

      // Suggested filename
      const ext = selectedStream.format || "mp4";
      if (ext === "mp3") {
        a.download = `${normalized.title.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_")}_audio.mp3`;
      } else if (ext === "zip" || ext === "cbz" || ext === "pdf") {
        a.download = `${normalized.title.slice(0, 35).replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
      } else if (normalized.fileName) {
        a.download = normalized.fileName;
      } else {
        a.download = `${normalized.title.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
      }

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        setDownloadState("completed");
      }, 1200);
    } catch {
      setDownloadState("failed");
    }
  };

  const handleOpenLink = () => {
    if (!selectedStream?.url) return;
    window.open(selectedStream.url, "_blank", "noopener,noreferrer");
  };

  // Platform visual badges & colors
  const getPlatformBadge = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("youtube")) {
      return {
        bg: "bg-red-500/15 border-red-500/30 text-red-400",
        icon: <Film className="w-3.5 h-3.5" />,
        label: "YouTube",
      };
    }
    if (p.includes("tiktok")) {
      return {
        bg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
        icon: <Play className="w-3.5 h-3.5" />,
        label: "TikTok (No Watermark)",
      };
    }
    if (p.includes("instagram")) {
      return {
        bg: "bg-pink-500/15 border-pink-500/30 text-pink-400",
        icon: <Film className="w-3.5 h-3.5" />,
        label: "Instagram Reel",
      };
    }
    if (p.includes("snack")) {
      return {
        bg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
        icon: <Play className="w-3.5 h-3.5" />,
        label: "SnackVideo",
      };
    }
    if (p.includes("terabox")) {
      return {
        bg: "bg-blue-500/15 border-blue-500/30 text-blue-400",
        icon: <HardDrive className="w-3.5 h-3.5" />,
        label: "Terabox Cloud",
      };
    }
    if (p.includes("manga") || p.includes("komik") || p.includes("webtoon")) {
      return {
        bg: "bg-purple-500/15 border-purple-500/30 text-purple-300",
        icon: <BookOpen className="w-3.5 h-3.5" />,
        label: "Manga & Komik Downloader",
      };
    }
    if (p.includes("image")) {
      return {
        bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
        icon: <ImageIcon className="w-3.5 h-3.5" />,
        label: "Image Downloader",
      };
    }
    if (p.includes("batch")) {
      return {
        bg: "bg-sky-500/15 border-sky-500/30 text-sky-400",
        icon: <ListChecks className="w-3.5 h-3.5" />,
        label: "Batch Downloader",
      };
    }
    if (p.includes("file") || p.includes("stream")) {
      return {
        bg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
        icon: <FileDown className="w-3.5 h-3.5" />,
        label: "File Downloader",
      };
    }
    return {
      bg: "bg-cyan-500/15 border-cyan-500/30 text-[#00E5FF]",
      icon: <Layers className="w-3.5 h-3.5" />,
      label: platform,
    };
  };

  const getFormatIcon = (format?: string) => {
    const f = (format || "").toLowerCase();
    if (f === "mp3" || f === "m4a") return <Music className="w-3.5 h-3.5" />;
    if (f === "zip" || f === "cbz") return <FolderDown className="w-3.5 h-3.5" />;
    if (f === "pdf") return <FileText className="w-3.5 h-3.5" />;
    if (f === "jpg" || f === "jpeg" || f === "png" || f === "webp") return <ImageIcon className="w-3.5 h-3.5" />;
    return <Film className="w-3.5 h-3.5" />;
  };

  const badge = getPlatformBadge(normalized.platform);

  return (
    <div className="space-y-4">
      {/* Main Glassmorphic Downloader Result Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1427] via-[#111827] to-[#151c2e] border border-cyan-500/30 p-5 sm:p-7 shadow-[0_0_35px_rgba(0,229,255,0.15)] animate-in fade-in zoom-in-95 duration-300">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 space-y-6">
          {/* Top Status & Platform Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${badge.bg}`}
              >
                {badge.icon}
                <span>{badge.label}</span>
              </span>

              {/* State pill */}
              {downloadState === "ready" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Siap Diunduh</span>
                </span>
              )}
              {downloadState === "downloading" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-cyan-400 bg-cyan-500/15 border border-cyan-500/30">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Memulai Unduhan...</span>
                </span>
              )}
              {downloadState === "completed" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Unduhan Dimulai</span>
                </span>
              )}
              {downloadState === "failed" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-red-400 bg-red-500/15 border border-red-500/30">
                  <AlertCircle className="w-3 h-3" />
                  <span>Gagal Mengunduh</span>
                </span>
              )}
            </div>

            <div className="text-[11px] font-mono text-gray-400">
              {normalized.qualities.length} Pilihan Stream Tersedia
            </div>
          </div>

          {/* Media Presentation: Thumbnail + Metadata */}
          <div className="flex flex-col md:flex-row gap-5 sm:gap-6 items-start">
            {/* Thumbnail Preview */}
            {normalized.thumbnail ? (
              <div className="relative w-full md:w-56 aspect-video sm:aspect-square md:aspect-video rounded-2xl overflow-hidden bg-[#080B14] border border-white/10 shrink-0 group shadow-lg">
                <img
                  src={normalized.thumbnail}
                  alt={normalized.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback on broken image
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                  {normalized.duration && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 text-[11px] font-mono text-white">
                      <Clock className="w-3 h-3 text-[#00E5FF]" />
                      <span>{normalized.duration}</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full md:w-44 aspect-video rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col items-center justify-center text-cyan-400 shrink-0">
                <Film className="w-8 h-8 opacity-60 mb-1" />
                <span className="text-[10px] font-mono text-gray-400">Media Preview</span>
              </div>
            )}

            {/* Media Information */}
            <div className="space-y-3 flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2">
                {normalized.title}
              </h3>

              <div className="flex items-center gap-4 text-xs text-gray-400 font-mono flex-wrap">
                {normalized.author && (
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <User className="w-3.5 h-3.5 text-[#00E5FF]" />
                    <span>{normalized.author}</span>
                  </span>
                )}
                {normalized.duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Durasi: {normalized.duration}</span>
                  </span>
                )}
                {selectedStream?.sizeFormatted && (
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-emerald-400">
                    Ukuran: {selectedStream.sizeFormatted}
                  </span>
                )}
              </div>

              {/* Quality Selector Tabs */}
              <div className="pt-2 space-y-2">
                <label className="text-xs font-semibold text-gray-300 block">
                  Pilih Format / Resolusi Unduhan:
                </label>
                <div className="flex flex-wrap gap-2">
                  {normalized.qualities.map((q, idx) => {
                    const isSelected = selectedQualityIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedQualityIndex(idx);
                          setDownloadState("ready");
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                          isSelected
                            ? "bg-[#00E5FF] text-black border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                            : "bg-[#080B14] hover:bg-white/5 text-gray-300 border-white/10"
                        }`}
                      >
                        {getFormatIcon(q.format)}
                        <span>{q.label}</span>
                        {q.sizeFormatted && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                              isSelected ? "bg-black/20 text-black" : "bg-white/10 text-gray-400"
                            }`}
                          >
                            {q.sizeFormatted}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Primary Download Trigger Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!selectedStream?.url || downloadState === "downloading"}
              className="px-6 py-3.5 rounded-2xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-black text-xs flex items-center justify-center gap-2.5 transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {downloadState === "downloading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Menginisiasi Unduhan...</span>
                </>
              ) : downloadState === "completed" ? (
                <>
                  <Check className="w-4 h-4 text-black" />
                  <span>Unduh Ulang ({selectedStream?.label})</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-black" />
                  <span>Unduh Sekarang ({selectedStream?.label})</span>
                </>
              )}
            </button>

            {/* Secondary Actions: Copy Link & Open in New Tab */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!selectedStream?.url}
                className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-[#080B14] hover:bg-white/5 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                title="Salin Tautan Unduhan Langsung"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenLink}
                disabled={!selectedStream?.url}
                className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-[#080B14] hover:bg-white/5 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                title="Buka Stream di Tab Baru"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka di Tab Baru</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data Toggle (for debugging & power users) */}
      <div className="text-right">
        <button
          type="button"
          onClick={() => setShowRawJson(!showRawJson)}
          className="text-[11px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
        >
          {showRawJson ? "▲ Sembunyikan Raw JSON" : "▼ Tampilkan Raw Data JSON"}
        </button>

        {showRawJson && (
          <pre className="mt-2 text-left p-4 rounded-xl bg-[#080B14] border border-white/5 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed max-h-60">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
