"use client";

import React, { useState } from "react";
import {
  Braces,
  CheckCircle2,
  AlertCircle,
  Send,
  Binary,
  ShieldCheck,
  ShieldAlert,
  Code,
  Palette,
  Hash,
  Key,
  Layers,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  MetricPill,
  ResultSectionTitle,
  PropertyRow,
  CopyButton,
  VisualCodeBlock,
} from "./SharedComponents";

interface DeveloperResultRendererProps {
  toolId: string;
  output: any;
  metadata?: any;
}

export const DeveloperResultRenderer: React.FC<DeveloperResultRendererProps> = ({
  toolId,
  output,
  metadata,
}) => {
  const [showHeaders, setShowHeaders] = useState(false);

  // -------------------------------------------------------------------
  // 1. JSON FORMATTER
  // -------------------------------------------------------------------
  if (toolId === "json-formatter") {
    const formattedCode = typeof output === "string" ? output : JSON.stringify(output, null, 2);
    const meta = metadata || {};

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricPill label="Jumlah Kunci / Elemen" value={meta.keysCount ?? "-"} variant="cyan" />
          <MetricPill label="Total Baris" value={meta.linesCount ?? formattedCode.split("\n").length} variant="emerald" />
          <MetricPill label="Panjang Karakter" value={meta.characterCount ?? formattedCode.length} variant="purple" />
          <MetricPill label="Ukuran Byte" value={meta.byteSize ? `${meta.byteSize} B` : "-"} variant="gray" />
        </div>

        <VisualCodeBlock code={formattedCode} language="json" title="Formatted JSON Output (RFC 8259)" />
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 2. JSON VALIDATOR
  // -------------------------------------------------------------------
  if (toolId === "json-validator") {
    const val = output;
    const isValid = val.isValid === true;

    return (
      <div className="space-y-6">
        {/* Validation Status Hero Banner */}
        <div
          className={`p-5 rounded-2xl border ${
            isValid
              ? "bg-gradient-to-br from-emerald-950/40 via-[#0c1427] to-[#111827] border-emerald-500/30"
              : "bg-gradient-to-br from-red-950/40 via-[#0c1427] to-[#111827] border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-3">
            {isValid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
            )}
            <div>
              <h3 className="text-base font-extrabold text-white">
                {isValid ? "Sintaks JSON Sempurna (100% Valid)" : "Kesalahan Sintaks JSON Terdeteksi"}
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">
                {isValid
                  ? "Struktur dokumen sepenuhnya mematuhi spesifikasi RFC 8259."
                  : `Kesalahan pada baris ${val.line || 1}, kolom ${val.column || 1}: ${val.error}`}
              </p>
            </div>
          </div>
        </div>

        {/* Invalid Snippet Visual Pointer */}
        {!isValid && val.snippet && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono">
              Lokasi Kesalahan Parser:
            </span>
            <div className="p-4 rounded-xl bg-[#080B14] border border-red-500/30 font-mono text-xs text-red-300 whitespace-pre overflow-x-auto leading-relaxed">
              {val.snippet}
            </div>
          </div>
        )}

        {/* Valid Stats */}
        {isValid && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricPill label="Tipe Struktur" value={val.structureType || "Object"} variant="cyan" />
            <MetricPill label="Total Properti" value={val.totalProperties ?? 1} variant="emerald" />
            <MetricPill label="Kedalaman Nesting" value={`${val.maximumNestingDepth || 1} Level`} variant="purple" />
            <MetricPill label="Ukuran Memori" value={val.byteSize || "-"} variant="gray" />
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 3. API TESTER
  // -------------------------------------------------------------------
  if (toolId === "api-tester") {
    const res = output;
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    const isRedirect = res.statusCode >= 300 && res.statusCode < 400;
    const strData =
      typeof res.data === "object" ? JSON.stringify(res.data, null, 2) : String(res.data || "");

    const badgeStyle = isSuccess
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
      : isRedirect
      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
      : "bg-red-500/20 text-red-300 border-red-500/40";

    return (
      <div className="space-y-5">
        {/* Status & Latency Banner */}
        <div className="p-4 rounded-2xl bg-[#080B14] border border-white/5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-mono font-extrabold border ${badgeStyle}`}>
              HTTP {res.statusCode} {res.statusText}
            </span>
            <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{res.latency || res.latencyMs || "-"}</span>
            </span>
          </div>

          {res.contentType && (
            <span className="text-[11px] font-mono text-gray-400 truncate max-w-xs">
              {res.contentType}
            </span>
          )}
        </div>

        {/* Collapsible Headers Accordion */}
        {res.headers && Object.keys(res.headers).length > 0 && (
          <div className="rounded-xl border border-white/5 bg-[#080B14] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHeaders(!showHeaders)}
              className="w-full px-4 py-2.5 bg-[#0c101d] flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white transition-colors"
            >
              <span>Response Headers ({Object.keys(res.headers).length})</span>
              {showHeaders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showHeaders && (
              <div className="p-3 divide-y divide-white/5 max-h-48 overflow-y-auto">
                {Object.entries(res.headers).map(([k, v], idx) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between text-xs font-mono gap-3">
                    <span className="text-gray-400 truncate">{k}:</span>
                    <span className="text-cyan-300 truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Response Data Body */}
        <VisualCodeBlock
          code={strData}
          language={res.contentType?.includes("json") ? "json" : "text"}
          title="Response Body"
        />
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 4. BASE64 ENCODER DECODER
  // -------------------------------------------------------------------
  if (toolId === "base64-encoder-decoder") {
    const text = typeof output === "string" ? output : "";
    const meta = metadata || {};

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#080B14] border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Tindakan:</span>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/10 text-[#00E5FF] uppercase">
              {meta.action || "Hasil Konversi"}
            </span>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {text.length} Karakter
          </span>
        </div>

        <VisualCodeBlock code={text} language="text" title="Hasil Base64" />
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 5. JWT DECODER
  // -------------------------------------------------------------------
  if (toolId === "jwt-decoder") {
    const jwt = output;
    const summary = jwt.summary || {};
    const header = jwt.header || {};
    const payload = jwt.payload || {};
    const sig = jwt.signature || {};

    const isExpired = summary.tokenState === "EXPIRED";

    return (
      <div className="space-y-6">
        {/* Token State Hero */}
        <div
          className={`p-5 rounded-2xl border ${
            isExpired
              ? "bg-red-500/10 border-red-500/30"
              : "bg-emerald-500/10 border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {isExpired ? (
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <div>
                <h4 className="text-sm font-extrabold text-white">
                  {isExpired ? "Token Telah Kedaluwarsa (Expired)" : "Token Aktif (Valid)"}
                </h4>
                <p className="text-xs text-gray-300 mt-0.5">{summary.expiryDate}</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-white/10 text-white">
              Algoritma: {summary.algorithm || "HS256"}
            </span>
          </div>
        </div>

        {/* Security Notice Disclaimer */}
        <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-[#00E5FF]" />
          <span>{sig.securityNotice || "Dekode dilakukan aman di browser lokal. Token tidak dikirimkan ke server eksternal manapun."}</span>
        </div>

        {/* Claims Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <ResultSectionTitle title="Header Klaim" icon={Braces} />
            <VisualCodeBlock code={JSON.stringify(header, null, 2)} language="json" />
          </div>

          <div className="space-y-2">
            <ResultSectionTitle title="Payload Data & Claims" icon={Layers} />
            <VisualCodeBlock code={JSON.stringify(payload, null, 2)} language="json" />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 6. REGEX TESTER
  // -------------------------------------------------------------------
  if (toolId === "regex-tester") {
    const reg = output;
    const matches: Array<{
      fullMatch: string;
      index: number;
      endIndex: number;
      groups: string[];
      namedGroups: Record<string, string>;
      lineNumber: number;
    }> = Array.isArray(reg.matches) ? reg.matches : [];

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2 p-3.5 rounded-xl bg-[#080B14] border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Pola:</span>
            <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/30">
              {reg.pattern}
            </span>
          </div>
          <MetricPill label="Total Kecocokan" value={`${reg.totalMatches || matches.length} Match`} variant="emerald" />
        </div>

        <div className="space-y-3">
          <ResultSectionTitle title="Daftar Kecocokan (Matches)" icon={Code} count={matches.length} />

          {matches.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#080B14] border border-white/5 text-center text-xs text-gray-400">
              Tidak ditemukan kecocokan pola pada teks pengujian yang diberikan.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {matches.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#080B14] border border-white/5 hover:border-cyan-500/30 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-[#00E5FF]">
                      Match #{idx + 1} (Baris {m.lineNumber})
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">
                      Index: {m.index} - {m.endIndex}
                    </span>
                  </div>

                  <p className="text-xs font-mono font-bold text-white bg-[#0c101d] p-2 rounded-lg border border-white/5">
                    {m.fullMatch}
                  </p>

                  {m.groups && m.groups.length > 0 && (
                    <div className="pt-1 flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-gray-400 text-[11px]">Capture Groups:</span>
                      {m.groups.map((g, gI) => (
                        <span
                          key={gI}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20"
                        >
                          ${gI + 1}: &quot;{g}&quot;
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 7. COLOR CONVERTER
  // -------------------------------------------------------------------
  if (toolId === "color-converter") {
    const c = output;
    const contrast = c.contrast || {};

    return (
      <div className="space-y-6">
        {/* Large Color Swatch Box */}
        <div className="p-6 rounded-3xl bg-[#080B14] border border-white/10 shadow-2xl flex flex-col sm:flex-row items-center gap-6">
          <div
            className="w-32 h-32 rounded-2xl shadow-[0_0_35px_rgba(0,0,0,0.5)] border-2 border-white/20 shrink-0 flex items-center justify-center font-bold font-mono text-sm shadow-xl"
            style={{ backgroundColor: c.previewHex || c.hex, color: contrast.recommendedTextColor || "#FFFFFF" }}
          >
            {c.hex}
          </div>

          <div className="space-y-3 text-center sm:text-left min-w-0 flex-1">
            <h3 className="text-xl font-extrabold text-white font-mono">{c.hex}</h3>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/10">
                {c.rgb}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/10">
                {c.hsl}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/10">
                {c.cmyk}
              </span>
            </div>

            <p className="text-xs text-gray-400">
              Rekomendasi Teks Kontras (WCAG):{" "}
              <span className="font-bold font-mono text-cyan-300">{contrast.recommendedTextColor}</span>
            </p>
          </div>
        </div>

        {/* Copy Ready Code Variables */}
        <div className="space-y-2">
          <ResultSectionTitle title="Format Siap Tempel (CSS & Tailwind)" icon={Palette} />
          <div className="rounded-xl border border-white/5 bg-[#080B14] divide-y divide-white/5 overflow-hidden">
            <PropertyRow label="CSS Variable" value={c.cssVariable} canCopy />
            <PropertyRow label="Tailwind Classes" value={c.tailwindClass} canCopy />
            <PropertyRow label="Format RGBA" value={c.rgba} canCopy />
            <PropertyRow label="Format HSLA" value={c.hsla} canCopy />
            <PropertyRow label="Format HSV" value={c.hsv} canCopy />
            <PropertyRow label="Format HEX 8-digit" value={c.hex8} canCopy />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 8. UUID GENERATOR
  // -------------------------------------------------------------------
  if (toolId === "uuid-generator") {
    const list = String(output).split("\n").filter(Boolean);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#080B14] border border-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Spesifikasi:</span>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/10 text-[#00E5FF]">
              RFC 4122 Version 4 (CSPRNG)
            </span>
          </div>
          <CopyButton text={list.join("\n")} label="Salin Semua UUID" />
        </div>

        <div className="space-y-2">
          {list.map((id, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-[#080B14] border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between gap-3 font-mono text-xs text-cyan-300"
            >
              <span className="truncate">{id}</span>
              <CopyButton text={id} label="Salin" size="sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 9. PASSWORD GENERATOR
  // -------------------------------------------------------------------
  if (toolId === "password-generator") {
    const pass = String(output);
    const meta = metadata || {};

    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c1427] to-[#111827] border border-cyan-500/30 shadow-[0_0_35px_rgba(0,229,255,0.15)] space-y-4 text-center">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/20">
              Kata Sandi Kriptografis Siap Pakai
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#080B14] border border-cyan-500/40 text-base sm:text-lg font-mono font-bold text-white break-all tracking-wider shadow-inner select-all">
            {pass}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <MetricPill label="Panjang Karakter" value={`${pass.length} Karakter`} variant="cyan" />
            <MetricPill label="Entropi Acak" value={meta.entropyBits || "Tinggi"} variant="emerald" />
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <CopyButton text={pass} label="Salin Kata Sandi" size="md" />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 10. CODE FORMATTER
  // -------------------------------------------------------------------
  if (toolId === "code-formatter") {
    const code = String(output);

    return (
      <div className="space-y-4">
        <VisualCodeBlock code={code} language={metadata?.language || "javascript"} title="Formatted Code" />
      </div>
    );
  }

  return <VisualCodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
};
