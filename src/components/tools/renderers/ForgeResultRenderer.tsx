"use client";

import React from "react";
import {
  QrCode,
  Palette,
  Image as ImageIcon,
  Sliders,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  Maximize2,
  Crop,
} from "lucide-react";
import {
  MetricPill,
  ResultSectionTitle,
  PropertyRow,
  CopyButton,
  VisualCodeBlock,
} from "./SharedComponents";

interface ForgeResultRendererProps {
  toolId: string;
  output: any;
  metadata?: any;
}

export const ForgeResultRenderer: React.FC<ForgeResultRendererProps> = ({
  toolId,
  output,
  metadata,
}) => {
  // -------------------------------------------------------------------
  // 1. QR CODE GENERATOR
  // -------------------------------------------------------------------
  if (toolId === "qr-code-generator") {
    const qrUrl = typeof output === "string" ? output : metadata?.downloadUrl;
    const content = metadata?.content || "";

    return (
      <div className="space-y-6 max-w-lg mx-auto text-center">
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0c1427] to-[#111827] border border-cyan-500/30 shadow-[0_0_35px_rgba(0,229,255,0.15)] space-y-5">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/20">
              QR Code Siap Digunakan
            </span>
            <p className="text-xs text-gray-400 pt-1">
              Pindai dengan kamera ponsel atau pemindai barcode standar
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white w-64 h-64 mx-auto flex items-center justify-center shadow-2xl border-4 border-cyan-500/40">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Generated QR Code"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-gray-400 text-xs font-mono">Gagal memuat QR</div>
            )}
          </div>

          {content && (
            <div className="p-3 rounded-xl bg-[#080B14] border border-white/5 text-xs text-gray-300 font-mono break-all text-left">
              <span className="text-[10px] uppercase text-gray-500 block mb-0.5">Isi Teks / Tautan QR:</span>
              {content}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            {qrUrl && (
              <a
                href={qrUrl}
                download="void-verse-qrcode.png"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Gambar QR</span>
              </a>
            )}
            <CopyButton text={content || qrUrl || ""} label="Salin Isi" />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 2. IMAGE COLOR EXTRACTOR
  // -------------------------------------------------------------------
  if (toolId === "image-color-extractor") {
    const colors: Array<{ name: string; hex: string; rgb: string; percentage: string }> =
      Array.isArray(output.dominantColors) ? output.dominantColors : [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricPill label="Format Sumber" value={output.detectedFormat || "Raster"} variant="cyan" />
          <MetricPill label="Dimensi" value={output.dimensions || "Variabel"} variant="purple" />
          <MetricPill label="Palet Ditemukan" value={`${colors.length} Warna`} variant="emerald" />
        </div>

        <div className="space-y-3">
          <ResultSectionTitle title="Palet Warna Dominan yang Diekstrak" icon={Palette} count={colors.length} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {colors.map((color, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#080B14] border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between gap-4 shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-12 h-12 rounded-xl shrink-0 shadow-inner border border-white/20 flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-xs font-bold text-white truncate">{color.name}</h4>
                    <p className="text-xs font-mono text-cyan-400 font-bold">{color.hex}</p>
                    <p className="text-[10px] font-mono text-gray-400">{color.rgb}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white">
                    {color.percentage}
                  </span>
                  <CopyButton text={color.hex} label="HEX" size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 3. IMAGE METADATA VIEWER
  // -------------------------------------------------------------------
  if (toolId === "image-metadata-viewer") {
    const meta = output;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricPill label="Format Berkas" value={meta.format || "Gambar"} variant="cyan" />
          <MetricPill label="Dimensi" value={meta.dimensionsFormatted || `${meta.width}x${meta.height}`} variant="purple" />
          <MetricPill label="Ukuran Berkas" value={meta.fileSizeFormatted?.split(" ")[0] || `${meta.fileSizeBytes} B`} variant="emerald" />
          <MetricPill label="Bit Depth" value={meta.bitDepth || "8-bit"} variant="gray" />
        </div>

        <div className="space-y-2">
          <ResultSectionTitle title="Spesifikasi & Header Magic Bytes" icon={Layers} />
          <div className="rounded-xl border border-white/5 bg-[#080B14] divide-y divide-white/5 overflow-hidden">
            <PropertyRow label="MIME Type" value={meta.mimeType} canCopy />
            <PropertyRow label="Lebar (Width)" value={`${meta.width} px`} />
            <PropertyRow label="Tinggi (Height)" value={`${meta.height} px`} />
            <PropertyRow label="Ruang Warna (Color Space)" value={meta.colorSpace} />
            <PropertyRow
              label="Kanal Transparansi (Alpha)"
              value={
                meta.hasAlphaChannel ? (
                  <span className="text-emerald-400 font-bold">Tersedia (Alpha / Transparan)</span>
                ) : (
                  <span className="text-gray-400">Tidak ada (Opaque)</span>
                )
              }
            />
            <PropertyRow label="Ukuran Byte Eksak" value={`${meta.fileSizeBytes} bytes`} />
            <PropertyRow label="Header Signature" value={meta.headerSignature} />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 4. IMAGE COMPRESSOR
  // -------------------------------------------------------------------
  if (toolId === "image-compressor") {
    const comp = output;

    return (
      <div className="space-y-6">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#0c1427] to-[#111827] border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Optimasi Ukuran Gambar Berhasil</span>
            </h3>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {comp.estimatedSavings || "Siap Dihemat"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <MetricPill label="Ukuran Awal" value={comp.originalSizeFormatted || `${comp.originalSizeBytes} B`} variant="gray" />
            <MetricPill label="Estimasi Hasil" value={`${Math.round(comp.estimatedCompressedBytes / 1024)} KB`} variant="emerald" />
            <MetricPill label="Format" value={comp.originalFormat} variant="cyan" />
            <MetricPill label="Kualitas Target" value={comp.targetQuality || "80%"} variant="amber" />
          </div>

          <p className="text-xs text-gray-300 bg-[#080B14] p-3 rounded-xl border border-white/5">
            {comp.note || "Kompresi raster siap diproses di peramban pengguna secara instan."}
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 5. IMAGE CONVERTER, RESIZER, CROPPER
  // -------------------------------------------------------------------
  if (["image-converter", "image-resizer", "image-cropper"].includes(toolId)) {
    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-[#080B14] border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#00E5FF]" />
              <span>Konfigurasi Pemrosesan Gambar Selesai</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300">
              Siap Diproses
            </span>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#0c101d] divide-y divide-white/5 overflow-hidden">
            {output.originalFormat && <PropertyRow label="Format Asal" value={output.originalFormat} />}
            {output.targetFormat && (
              <PropertyRow
                label="Format Target Konversi"
                value={<span className="text-[#00E5FF] font-bold">{output.targetFormat}</span>}
              />
            )}
            {output.originalDimensions && (
              <PropertyRow label="Dimensi Awal" value={output.originalDimensions} />
            )}
            {output.targetWidth && output.targetHeight && (
              <PropertyRow
                label="Dimensi Baru Target"
                value={`${output.targetWidth} x ${output.targetHeight} px`}
              />
            )}
            {output.cropPreset && (
              <PropertyRow label="Preset Rasio Crop" value={output.cropPreset} />
            )}
            {output.status && <PropertyRow label="Status Eksekusi" value={output.status} />}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 6. SCREENSHOT ANALYZER
  // -------------------------------------------------------------------
  if (toolId === "screenshot-analyzer") {
    const text = typeof output === "string" ? output : output.text || "";

    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-[#080B14] border border-cyan-500/20 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-[#00E5FF]" />
              <span>Hasil Analisis Tangkapan Layar Panel</span>
            </h3>
            <CopyButton text={text} label="Salin Analisis" />
          </div>

          <div className="text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 7. BACKGROUND REMOVER & IMAGE UPSCALER
  // -------------------------------------------------------------------
  if (["background-remover", "image-upscaler"].includes(toolId)) {
    const imgUrl = typeof output === "string" ? output : metadata?.downloadUrl;

    return (
      <div className="space-y-5 text-center">
        <div className="p-5 sm:p-6 rounded-2xl bg-[#080B14] border border-cyan-500/30 space-y-4 max-w-md mx-auto">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/20">
            {toolId === "background-remover" ? "Latar Belakang Berhasil Dihapus" : "Resolusi Berhasil Ditingkatkan (2x)"}
          </span>

          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-square flex items-center justify-center">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt="Hasil Visual"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-gray-400 text-xs">Pratinjau tidak tersedia</div>
            )}
          </div>

          {imgUrl && (
            <div className="pt-2 flex items-center justify-center gap-3">
              <a
                href={imgUrl}
                download={toolId === "background-remover" ? "removed-bg.png" : "upscaled.png"}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Hasil</span>
              </a>
              <CopyButton text={imgUrl} label="Salin URL" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return <VisualCodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
};
