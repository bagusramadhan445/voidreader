"use client";

import React, { useState, useEffect } from "react";
import { getToolsSettings, saveApiKey } from "@/lib/tools/storage";
import { toolApiService } from "@/lib/tools/api-service";
import {
  X,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProvider?: string;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  defaultProvider = "openai",
}) => {
  const [activeTab, setActiveTab] = useState(defaultProvider);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const settings = getToolsSettings();
      const current = settings.apiProviders[activeTab];
      setApiKey(current?.apiKey || "");
      setBaseUrl(current?.baseUrl || (activeTab === "openrouter" ? "https://openrouter.ai/api/v1" : ""));
      setModel(current?.model || (activeTab === "openrouter" ? "google/gemini-2.5-flash" : ""));
      setTestResult(null);
      setShowKey(false);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveApiKey(activeTab, apiKey, baseUrl, model);
    setTestResult({
      valid: true,
      message: `Kunci API ${activeTab.toUpperCase()} berhasil disimpan secara lokal!`,
    });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await toolApiService.testProviderApiKey(
        activeTab as any,
        apiKey,
        baseUrl
      );
      setTestResult(result);
      if (result.valid) {
        saveApiKey(activeTab, apiKey, baseUrl, model);
      }
    } finally {
      setTesting(false);
    }
  };

  const providers = [
    { id: "openrouter", name: "OpenRouter", desc: "Universal Multi-Model AI (Gemini 2.5, DeepSeek, GPT, Llama)", link: "https://openrouter.ai/keys" },
    { id: "openai", name: "OpenAI", desc: "GPT-4o, DALL-E 3, Embeddings", link: "https://platform.openai.com/api-keys" },
    { id: "gemini", name: "Google Gemini", desc: "Gemini 1.5 Flash & Pro", link: "https://aistudio.google.com/" },
    { id: "replicate", name: "Replicate", desc: "Flux, SDXL, Background Cutout", link: "https://replicate.com/account/api-tokens" },
    { id: "remove_bg", name: "Remove.bg", desc: "Penghapus Background Transparan", link: "https://www.remove.bg/api" },
    { id: "github", name: "GitHub API", desc: "Personal Token (5,000 req/jam)", link: "https://github.com/settings/tokens" },
    { id: "custom", name: "Custom API / Proxy", desc: "Self-hosted LLM atau Reverse Proxy", link: "" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f172a] rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,229,255,0.15)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#111827]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-[#00E5FF]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Konfigurasi API Eksternal</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/30">
                  Lokal & Aman
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Kunci API Anda tersimpan 100% lokal di browser dan tidak pernah dikirim ke pihak ketiga.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Provider Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-white/5">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === p.id
                    ? "bg-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                    : "bg-[#1e293b] text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span>{p.name}</span>
              </button>
            ))}
          </div>

          {/* Active Provider Info */}
          {(() => {
            const current = providers.find((p) => p.id === activeTab);
            return (
              <div className="p-4 rounded-2xl bg-[#1e293b]/70 border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{current?.name} Provider</h4>
                  <p className="text-xs text-gray-400">{current?.desc}</p>
                </div>
                {current?.link && (
                  <a
                    href={current.link}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00E5FF] text-xs font-semibold flex items-center gap-1.5 transition-all border border-cyan-500/30"
                  >
                    <span>Dapatkan Key</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            );
          })()}

          {/* Input Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                API Key {activeTab.toUpperCase()}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder={
                    activeTab === "openrouter"
                      ? "sk-or-v1-..."
                      : activeTab === "openai"
                      ? "sk-proj-..."
                      : "Masukkan kunci API..."
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-[#080B14] text-sm text-gray-100 placeholder-gray-600 pl-4 pr-12 py-3 rounded-xl border border-gray-700 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {activeTab === "openrouter" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    Base URL OpenRouter
                  </label>
                  <input
                    type="text"
                    placeholder="https://openrouter.ai/api/v1"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full bg-[#080B14] text-sm text-gray-100 placeholder-gray-600 px-4 py-3 rounded-xl border border-gray-700 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Default: <code className="text-cyan-400 font-mono">https://openrouter.ai/api/v1</code>
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    Default Model
                  </label>
                  <input
                    type="text"
                    placeholder="google/gemini-2.5-flash"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-[#080B14] text-sm text-gray-100 placeholder-gray-600 px-4 py-3 rounded-xl border border-gray-700 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono mb-2"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      "google/gemini-2.5-flash",
                      "deepseek/deepseek-chat",
                      "openai/gpt-5",
                      "meta-llama/llama-3.3-70b-instruct",
                    ].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModel(m)}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                          model === m
                            ? "bg-cyan-500/20 text-[#00E5FF] border-cyan-500/40"
                            : "bg-[#080B14] text-gray-400 border-gray-700 hover:text-white"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "custom" && (
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Base URL / Endpoint Kustom
                </label>
                <input
                  type="text"
                  placeholder="https://my-proxy.domain.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-[#080B14] text-sm text-gray-100 placeholder-gray-600 px-4 py-3 rounded-xl border border-gray-700 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono"
                />
              </div>
            )}

            {/* Test Result Feedback */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  testResult.valid
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/15 border-red-500/30 text-red-300"
                }`}
              >
                {testResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/10 bg-[#111827] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Tersimpan di IndexedDB / LocalStorage</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleTest}
              disabled={testing || !apiKey.trim()}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-[#00E5FF] text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40"
            >
              {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Uji Koneksi</span>
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black text-xs font-extrabold shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all"
            >
              Simpan Konfigurasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
