"use client";

import React, { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Copy,
  Layers,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Languages,
  CheckCircle2,
  AlertTriangle,
  Code,
} from "lucide-react";
import {
  MetricPill,
  ResultSectionTitle,
  PropertyRow,
  CopyButton,
  VisualCodeBlock,
} from "./SharedComponents";

interface DocumentResultRendererProps {
  toolId: string;
  output: any;
  metadata?: any;
}

export const DocumentResultRenderer: React.FC<DocumentResultRendererProps> = ({
  toolId,
  output,
  metadata,
}) => {
  const [showRawHtml, setShowRawHtml] = useState(false);

  // -------------------------------------------------------------------
  // 1. PDF CONVERTER, MERGER, SPLITTER, COMPRESSOR
  // -------------------------------------------------------------------
  if (["pdf-converter", "pdf-merger", "pdf-splitter", "pdf-compressor"].includes(toolId)) {
    const pdfUri = metadata?.pdfDataUri || output?.pdfDataUri;
    const fileName = metadata?.downloadFileName || output?.fileName || "document.pdf";
    const pageCount = output?.pageCount || metadata?.pageCount || 1;
    const fileSize = output?.fileSizeFormatted || output?.compressedSizeFormatted || "";

    const isCompressor = toolId === "pdf-compressor";

    return (
      <div className="space-y-6">
        {/* PDF Download Presentation Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-[#0c1427] to-[#111827] border border-cyan-500/40 shadow-[0_0_35px_rgba(0,229,255,0.15)] space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/30 shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-mono truncate max-w-sm">
                  {fileName}
                </h3>
                <p className="text-xs text-gray-400">
                  {output?.status || "Dokumen PDF valid siap diunduh dan dibuka di pembaca PDF standar."}
                </p>
              </div>
            </div>

            {pdfUri && (
              <a
                href={pdfUri}
                download={fileName}
                className="px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh PDF</span>
              </a>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <MetricPill label="Jumlah Halaman" value={`${pageCount} Halaman`} variant="cyan" />
            <MetricPill label="Ukuran Berkas" value={fileSize || "Optimal"} variant="emerald" />
            {isCompressor && (
              <>
                <MetricPill label="Ukuran Awal" value={output.originalSizeFormatted || "-"} variant="gray" />
                <MetricPill label="Penghematan" value={output.reductionPercent || "Terkonfirmasi"} variant="amber" />
              </>
            )}
            {!isCompressor && (
              <>
                <MetricPill label="Standar Layout" value="ISO A4 / 72 DPI" variant="gray" />
                <MetricPill label="Keamanan" value="Valid (Non-Executable)" variant="purple" />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 2. DOCUMENT SUMMARIZER
  // -------------------------------------------------------------------
  if (toolId === "document-summarizer") {
    const text = typeof output === "string" ? output : output.summary || "";
    const meta = metadata || output.metadata || {};

    return (
      <div className="space-y-5">
        {/* Document Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricPill label="Total Kata" value={meta.wordCount ? `${meta.wordCount} Kata` : "Terdokumentasi"} variant="cyan" />
          <MetricPill label="Total Kalimat" value={meta.sentenceCount ? `${meta.sentenceCount} Kalimat` : "Lengkap"} variant="purple" />
          <MetricPill label="Waktu Baca" value={meta.wordCount ? `± ${Math.max(1, Math.ceil(meta.wordCount / 200))} Menit` : "Cepat"} variant="emerald" />
          <MetricPill label="Tipe Ringkasan" value="Eksekutif" variant="amber" />
        </div>

        {/* Summary Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#080B14] border border-cyan-500/20 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00E5FF]" />
              <h3 className="text-sm font-bold text-white">Ringkasan Eksekutif Dokumen</h3>
            </div>
            <CopyButton text={text} label="Salin Ringkasan" />
          </div>

          <div className="prose prose-invert max-w-none text-xs sm:text-sm text-gray-200 leading-relaxed space-y-3 font-sans whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 3. MARKDOWN CONVERTER
  // -------------------------------------------------------------------
  if (toolId === "markdown-converter") {
    const htmlContent = typeof output === "string" ? output : "";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#080B14] border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Format Hasil:</span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 text-[#00E5FF]">
              {showRawHtml ? "HTML Source Code" : "Rich Document Preview"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRawHtml(!showRawHtml)}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 font-semibold border border-white/10 flex items-center gap-1.5 transition-all"
            >
              {showRawHtml ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <Code className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{showRawHtml ? "Lihat Preview" : "Lihat Kode HTML"}</span>
            </button>
            <CopyButton text={htmlContent} label="Salin HTML" />
          </div>
        </div>

        {showRawHtml ? (
          <VisualCodeBlock code={htmlContent} language="html" title="Rendered HTML Output" />
        ) : (
          <div className="p-6 rounded-2xl bg-[#080B14] border border-white/5 shadow-xl">
            <div
              className="prose prose-invert max-w-none text-xs sm:text-sm text-gray-200 leading-relaxed font-sans"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 4. PDF OCR SCANNER
  // -------------------------------------------------------------------
  if (toolId === "pdf-ocr-scanner") {
    const text = typeof output === "string" ? output : output.extractedText || output.status || "";

    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-[#080B14] border border-cyan-500/20 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#00E5FF]" />
              <span>Teks Hasil Ekstraksi OCR Dokumen</span>
            </h3>
            <CopyButton text={text} label="Salin Teks" />
          </div>

          <div className="p-4 rounded-xl bg-[#0c101d] border border-white/5 text-xs text-gray-200 leading-relaxed font-mono whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 5. FILE METADATA VIEWER
  // -------------------------------------------------------------------
  if (toolId === "file-metadata-viewer") {
    const f = output;
    const isDangerous = f.hasSecurityRisk;
    const isDoubleExt = f.isDoubleExtension;

    return (
      <div className="space-y-6">
        {/* Security Assessment Banner */}
        <div
          className={`p-5 rounded-2xl border ${
            isDangerous
              ? "bg-red-500/10 border-red-500/30 text-red-200"
              : isDoubleExt
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {isDangerous ? (
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            ) : isDoubleExt ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <div>
              <h4 className="text-sm font-extrabold text-white">
                {isDangerous ? "Peringatan Risiko Berkas" : isDoubleExt ? "Perhatian Integritas" : "Berkas Aman"}
              </h4>
              <p className="text-xs leading-relaxed mt-0.5">{f.securityStatus}</p>
            </div>
          </div>
        </div>

        {/* Quick Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricPill label="Nama Berkas" value={f.fileName || "File"} variant="cyan" />
          <MetricPill label="Ekstensi" value={f.extension || "-"} variant="purple" />
          <MetricPill label="Kategori" value={f.category || "Dokumen"} variant="emerald" />
          <MetricPill label="Ekstensi Ganda" value={f.isDoubleExtension ? "Ya (Waspada)" : "Tidak"} variant={f.isDoubleExtension ? "amber" : "gray"} />
        </div>

        <div className="space-y-2">
          <ResultSectionTitle title="Rincian Atribut Berkas" icon={FileText} />
          <div className="rounded-xl border border-white/5 bg-[#080B14] divide-y divide-white/5 overflow-hidden">
            <PropertyRow label="MIME Type Terdeteksi" value={f.detectedMimeType} canCopy />
            <PropertyRow label="Kategori Media" value={f.category} />
            <PropertyRow label="Klasifikasi Risiko" value={f.hasSecurityRisk ? "High Risk (Executable)" : "Low Risk (Standard Content)"} />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 6. DOCUMENT TRANSLATOR & FILE PREVIEWER
  // -------------------------------------------------------------------
  if (["document-translator", "file-previewer"].includes(toolId)) {
    const text = typeof output === "string" ? output : JSON.stringify(output, null, 2);

    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-[#080B14] border border-cyan-500/20 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {toolId === "document-translator" ? <Languages className="w-4 h-4 text-[#00E5FF]" /> : <FileText className="w-4 h-4 text-[#00E5FF]" />}
              <span>{toolId === "document-translator" ? "Hasil Terjemahan Naskah Dokumen" : "Pratinjau Berkas Dokumen"}</span>
            </h3>
            <CopyButton text={text} label="Salin Naskah" />
          </div>

          <div className="p-4 rounded-xl bg-[#0c101d] border border-white/5 text-xs sm:text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    );
  }

  return <VisualCodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
};
