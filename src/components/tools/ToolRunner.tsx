"use client";

import React, { useState } from "react";
import { ToolDefinition, ToolExecutionResult } from "@/lib/tools/types";
import { toolApiService } from "@/lib/tools/api-service";
import {
  Play,
  Loader2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { ToolResultRenderer } from "./renderers/ToolResultRenderer";

export type DownloaderWorkflowPhase =
  | "detecting"
  | "resolving"
  | "fetching_metadata"
  | "preparing_files"
  | "ready"
  | "failed";

interface ToolRunnerProps {
  tool: ToolDefinition;
  onOpenApiConfig?: () => void;
}

export const ToolRunner: React.FC<ToolRunnerProps> = ({ tool, onOpenApiConfig }) => {
  // Initialize form state from default values
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    tool.inputs?.forEach((f) => {
      if (f.defaultValue !== undefined) {
        initial[f.id] = f.defaultValue;
      }
    });
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ToolExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloaderPhase, setDownloaderPhase] = useState<DownloaderWorkflowPhase>("detecting");

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleExecute = async () => {
    setLoading(true);
    setResult(null);
    setCopied(false);

    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    let t3: ReturnType<typeof setTimeout> | undefined;

    if (tool.categoryId === "downloader") {
      setDownloaderPhase("detecting");
      t1 = setTimeout(() => setDownloaderPhase("resolving"), 400);
      t2 = setTimeout(() => setDownloaderPhase("fetching_metadata"), 1100);
      t3 = setTimeout(() => setDownloaderPhase("preparing_files"), 2000);
    }

    try {
      const res = await toolApiService.executeTool(tool, formData);
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
      setResult(res);
      if (tool.categoryId === "downloader") {
        setDownloaderPhase(res.success ? "ready" : "failed");
      }
    } catch {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
      if (tool.categoryId === "downloader") {
        setDownloaderPhase("failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.output) return;
    const textToCopy =
      typeof result.output === "object"
        ? JSON.stringify(result.output, null, 2)
        : String(result.output);

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    const initial: Record<string, any> = {};
    tool.inputs?.forEach((f) => {
      if (f.defaultValue !== undefined) {
        initial[f.id] = f.defaultValue;
      }
    });
    setFormData(initial);
    setResult(null);
  };

  const handleLoadExample = (exampleInput: Record<string, any>) => {
    setFormData({ ...formData, ...exampleInput });
  };

  return (
    <div className="space-y-6">
      {/* Examples Bar (if available) */}
      {tool.examples && tool.examples.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-[#080B14] border border-white/5 text-xs">
          <span className="text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>Contoh Preset:</span>
          </span>
          {tool.examples.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleLoadExample(ex.input)}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00E5FF] font-medium border border-cyan-500/30 transition-all"
            >
              {ex.title}
            </button>
          ))}
        </div>
      )}

      {/* Input Fields Form */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#111827] border border-white/5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Konfigurasi & Parameter Input</span>
          </h3>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {tool.inputs && tool.inputs.length > 0 ? (
          <div className="space-y-4">
            {tool.inputs.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span>
                    {field.label} {field.required && <span className="text-rose-400">*</span>}
                  </span>
                  {field.description && (
                    <span className="text-[10px] text-gray-500 font-normal">
                      {field.description}
                    </span>
                  )}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    rows={4}
                    placeholder={field.placeholder}
                    value={formData[field.id] ?? ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full bg-[#080B14] text-sm text-gray-100 placeholder-gray-600 p-3.5 rounded-xl border border-gray-800 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono transition-all"
                  />
                ) : field.type === "select" ? (
                  <select
                    value={formData[field.id] ?? field.defaultValue ?? ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full bg-[#080B14] text-sm text-gray-100 p-3 rounded-xl border border-gray-800 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 transition-all cursor-pointer"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#111827] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "number" ? (
                  <input
                    type="number"
                    value={formData[field.id] ?? field.defaultValue ?? ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full bg-[#080B14] text-sm text-gray-100 p-3 rounded-xl border border-gray-800 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono transition-all"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={formData[field.id] ?? ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full bg-[#080B14] text-sm text-gray-100 placeholder-gray-600 p-3 rounded-xl border border-gray-800 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono transition-all"
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            Alat ini tidak memerlukan parameter khusus. Klik tombol di bawah untuk menjalankan.
          </p>
        )}

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {tool.requiresApiKey && onOpenApiConfig ? (
            <button
              type="button"
              onClick={onOpenApiConfig}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Konfigurasi Kunci API ({tool.requiresApiKey.toUpperCase()})</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleExecute}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Eksekusi...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black" />
                <span>Jalankan Alat ({tool.name})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Downloader Processing State Indicator */}
      {loading && tool.categoryId === "downloader" && (
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-[#0c1427] via-[#111827] to-[#151c2e] border border-cyan-500/30 space-y-5 shadow-[0_0_35px_rgba(0,229,255,0.15)] animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-ping" />
              <h4 className="text-sm font-extrabold text-white">Alur Downloader Terpadu</h4>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/20 uppercase font-bold">
              Status: {downloaderPhase.replace("_", " ")}
            </span>
          </div>

          {/* Stepper pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { id: "detecting", label: "1. Detecting", desc: "Mendeteksi Target & Format" },
              { id: "resolving", label: "2. Resolving", desc: "Resolver Provider" },
              { id: "fetching_metadata", label: "3. Metadata", desc: "Ekstraksi Informasi" },
              { id: "preparing_files", label: "4. Preparing Files", desc: "Menyiapkan Media / Arsip" },
            ].map((st) => {
              const order = ["detecting", "resolving", "fetching_metadata", "preparing_files", "ready"];
              const currentIndex = order.indexOf(downloaderPhase);
              const stepIndex = order.indexOf(st.id);
              const isPast = currentIndex > stepIndex;
              const isCurrent = currentIndex === stepIndex;

              return (
                <div
                  key={st.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    isCurrent
                      ? "bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                      : isPast
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-[#080B14] border-white/5 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#00E5FF] animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
                    )}
                    <span className="text-[11px] font-bold text-white">{st.label}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">{st.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Output Results Container via Unified ToolResultRenderer */}
      {result && <ToolResultRenderer tool={tool} result={result} />}
    </div>
  );
};
