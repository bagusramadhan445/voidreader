"use client";

import React, { useState } from "react";
import { ToolDefinition, ToolExecutionResult } from "@/lib/tools/types";
import {
  Clock,
  Copy,
  Check,
  Code,
  Layout,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Sparkles,
} from "lucide-react";
import { ScraperResultRenderer } from "./ScraperResultRenderer";
import { ForgeResultRenderer } from "./ForgeResultRenderer";
import { DocumentResultRenderer } from "./DocumentResultRenderer";
import { DeveloperResultRenderer } from "./DeveloperResultRenderer";
import { AiResultRenderer } from "./AiResultRenderer";
import { DownloaderResultCard, isDownloaderResult } from "../DownloaderResultCard";
import { VisualCodeBlock, CopyButton } from "./SharedComponents";

interface ToolResultRendererProps {
  tool: ToolDefinition;
  result: ToolExecutionResult;
}

export const ToolResultRenderer: React.FC<ToolResultRendererProps> = ({ tool, result }) => {
  const [activeTab, setActiveTab] = useState<"visual" | "raw">("visual");

  if (!result) return null;

  // -------------------------------------------------------------------
  // ERROR VIEW
  // -------------------------------------------------------------------
  if (!result.success) {
    const errCode = result.errorCode;
    const errMsg = result.error || "Gagal memproses permintaan alat.";

    return (
      <div className="p-5 sm:p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-3.5 shadow-xl animate-in fade-in duration-200">
        <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
        <div className="space-y-2 w-full">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-extrabold text-white text-sm">
              {tool.categoryId === "downloader" ? "Gagal Mengekstrak Media Unduhan" : "Gagal Mengeksekusi Alat"}
            </h4>
            {errCode && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                [{errCode}]
              </span>
            )}
          </div>

          <p className="leading-relaxed text-red-200 font-sans">{errMsg}</p>

          {/* Contextual Guidance */}
          {errCode === "CONFIG_ERROR" && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-1">
              <p className="font-bold">Kredensial API Belum Diatur:</p>
              <p className="text-amber-200/90">
                Alat ini memerlukan kunci API eksternal. Silakan buka Pengaturan API untuk memasukkan kredensial Anda.
              </p>
            </div>
          )}

          {errCode === "AUTH_ERROR" && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[11px]">
              <p className="font-bold">Akses Ditolak / Perlindungan Keamanan (SSRF):</p>
              <p className="text-red-200/90 mt-0.5">
                Target URL tidak diizinkan atau berada di dalam subnet IP internal yang dilindungi.
              </p>
            </div>
          )}

          {errCode === "NO_DATA" && (
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 text-[11px]">
              <p className="font-bold">Data Tidak Ditemukan:</p>
              <p className="text-cyan-200/90 mt-0.5">
                Halaman berhasil diakses tetapi tidak ditemukan konten yang cocok dengan parameter pencarian.
              </p>
            </div>
          )}

          {errCode === "TIMEOUT" && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
              <p className="font-bold">Batas Waktu Terlampaui (Timeout):</p>
              <p className="text-amber-200/90 mt-0.5">
                Server target memerlukan waktu terlalu lama untuk merespons. Silakan coba kembali sesaat lagi.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // SUCCESS VIEW
  // -------------------------------------------------------------------
  const rawDataString =
    typeof result.output === "object"
      ? JSON.stringify(result.output, null, 2)
      : String(result.output || "");

  // Determine renderer by category
  const renderVisualContent = () => {
    // 1. Downloader Category
    if (tool.categoryId === "downloader" || isDownloaderResult(result.output)) {
      return <DownloaderResultCard data={result.output} />;
    }

    // 2. Scraper Category
    if (tool.categoryId === "scraper") {
      return (
        <ScraperResultRenderer
          toolId={tool.id}
          output={result.output}
          metadata={result.metadata}
        />
      );
    }

    // 3. Forge Category
    if (tool.categoryId === "forge") {
      return (
        <ForgeResultRenderer
          toolId={tool.id}
          output={result.output}
          metadata={result.metadata}
        />
      );
    }

    // 4. Document Category
    if (tool.categoryId === "document") {
      return (
        <DocumentResultRenderer
          toolId={tool.id}
          output={result.output}
          metadata={result.metadata}
        />
      );
    }

    // 5. Developer Category
    if (tool.categoryId === "developer") {
      return (
        <DeveloperResultRenderer
          toolId={tool.id}
          output={result.output}
          metadata={result.metadata}
        />
      );
    }

    // 6. AI Category
    if (tool.categoryId === "ai") {
      return (
        <AiResultRenderer
          toolId={tool.id}
          output={result.output}
          metadata={result.metadata}
        />
      );
    }

    // Fallback: Code / Text / Image
    if (result.outputType === "image") {
      return (
        <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-square flex items-center justify-center">
          <img src={result.output} alt="Hasil Visual" className="w-full h-full object-contain" />
        </div>
      );
    }

    if (result.outputType === "code") {
      return (
        <VisualCodeBlock
          code={rawDataString}
          language={result.outputLanguage || "text"}
          title="Hasil Kode"
        />
      );
    }

    return (
      <div className="p-5 rounded-2xl bg-[#080B14] border border-white/5 text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-wrap">
        {String(result.output)}
      </div>
    );
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#111827] border border-cyan-500/30 space-y-5 shadow-[0_0_30px_rgba(0,229,255,0.1)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/5 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
          <h3 className="text-sm font-extrabold text-white">Hasil Eksekusi</h3>
          {result.executionTimeMs !== undefined && (
            <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/20">
              <Clock className="w-3 h-3" />
              <span>{result.executionTimeMs} ms</span>
            </span>
          )}
        </div>

        {/* View Mode Tabs (Visual vs Raw JSON) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-[#080B14] border border-white/5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("visual")}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "visual"
                  ? "bg-cyan-500 text-black shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Hasil Visual</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("raw")}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "raw"
                  ? "bg-cyan-500 text-black shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON / Mentah</span>
            </button>
          </div>

          <CopyButton text={rawDataString} label="Salin Semua" size="md" />
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {activeTab === "visual" ? (
          renderVisualContent()
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400">
                Representasi Data Terstruktur Lengkap:
              </span>
            </div>
            <VisualCodeBlock
              code={rawDataString}
              language={typeof result.output === "object" ? "json" : "text"}
              title="Raw JSON / Data Payload"
            />
          </div>
        )}
      </div>
    </div>
  );
};
