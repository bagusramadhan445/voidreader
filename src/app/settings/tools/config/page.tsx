"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getToolsSettings, saveApiKey, resetToolsSettings } from "@/lib/tools/storage";
import { toolApiService } from "@/lib/tools/api-service";
import { ApiProviderStatus } from "@/lib/tools/types";
import { ProviderStatusCard } from "@/lib/tools/providers/provider-manager";
import { ClientDownloaderProviderConfig, DownloaderPlatformId } from "@/lib/tools/providers/downloader/types";
import {
  ChevronRight,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  Trash2,
  Lock,
  RefreshCw,
  Cpu,
  Image as ImageIcon,
  Database,
  Terminal,
  Server,
  Zap,
  Download,
  Video,
  Check,
  Power,
  Sliders,
} from "lucide-react";

interface ProviderDef {
  id: string;
  name: string;
  category: "ai" | "image" | "data" | "developer" | "custom";
  desc: string;
  link: string;
  placeholder: string;
  isPublicApi?: boolean;
}

const PROVIDER_DEFS: ProviderDef[] = [
  // AI
  {
    id: "openrouter",
    name: "OpenRouter",
    category: "ai",
    desc: "Universal AI Gateway (Gemini 2.5, DeepSeek, Llama, GPT)",
    link: "https://openrouter.ai/keys",
    placeholder: "sk-or-v1-...",
  },
  {
    id: "openai",
    name: "OpenAI API",
    category: "ai",
    desc: "GPT-4o, GPT-4o-mini, DALL-E 3, Text Embedding",
    link: "https://platform.openai.com/api-keys",
    placeholder: "sk-proj-...",
  },
  {
    id: "gemini",
    name: "Google Gemini API",
    category: "ai",
    desc: "Gemini 1.5 Flash, Gemini 1.5 Pro multimodal",
    link: "https://aistudio.google.com/",
    placeholder: "AIzaSy...",
  },
  {
    id: "replicate",
    name: "Replicate API",
    category: "ai",
    desc: "Flux Schnell, SDXL, Real-ESRGAN Upscaler",
    link: "https://replicate.com/account/api-tokens",
    placeholder: "r8_...",
  },

  // Image
  {
    id: "remove_bg",
    name: "Remove.bg API",
    category: "image",
    desc: "Penghapus background otomatis resolusi tinggi",
    link: "https://www.remove.bg/api",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx",
  },

  // Data
  {
    id: "mangadex",
    name: "MangaDex API",
    category: "data",
    desc: "Katalog manga global & feed bab (Akses Publik)",
    link: "https://api.mangadex.org/docs/",
    placeholder: "Tidak perlu kunci (Publik)",
    isPublicApi: true,
  },
  {
    id: "anilist",
    name: "AniList API",
    category: "data",
    desc: "Database manga GraphQL terlengkap (Akses Publik)",
    link: "https://anilist.gitbook.io/anilist-apiv2-docs",
    placeholder: "Tidak perlu kunci (Publik)",
    isPublicApi: true,
  },
  {
    id: "jikan",
    name: "Jikan API (MyAnimeList)",
    category: "data",
    desc: "REST API MyAnimeList resmi (Base URL: https://api.jikan.moe/v4)",
    link: "https://jikan.moe/",
    placeholder: "Tidak perlu kunci (Publik)",
    isPublicApi: true,
  },

  // Developer
  {
    id: "github",
    name: "GitHub API",
    category: "developer",
    desc: "Personal Access Token untuk batas 5.000 req/jam",
    link: "https://github.com/settings/tokens",
    placeholder: "ghp_...",
  },

  // Custom
  {
    id: "custom",
    name: "Custom API / Proxy",
    category: "custom",
    desc: "Self-hosted Ollama, vLLM, atau reverse proxy server custom",
    link: "",
    placeholder: "Bearer token atau sk-...",
  },
];

export default function ToolsConfigPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("downloader");
  const [activeTab, setActiveTab] = useState<string>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, ProviderStatusCard>>({});
  const [testResult, setTestResult] = useState<{ valid: boolean; status: ApiProviderStatus; message: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Downloader Providers state (Admin-Managed)
  const [downloaderConfigs, setDownloaderConfigs] = useState<ClientDownloaderProviderConfig[]>([]);
  const [activeDownloaderId, setActiveDownloaderId] = useState<DownloaderPlatformId>("youtube");
  const [editDlKey, setEditDlKey] = useState<string>("");
  const [editDlBaseUrl, setEditDlBaseUrl] = useState<string>("");
  const [editDlEndpoint, setEditDlEndpoint] = useState<string>("");
  const [editDlEnabled, setEditDlEnabled] = useState<boolean>(true);
  const [showDlKey, setShowDlKey] = useState<boolean>(false);
  const [testingDl, setTestingDl] = useState<boolean>(false);
  const [savingDl, setSavingDl] = useState<boolean>(false);
  const [dlTestResult, setDlTestResult] = useState<{ status: string; message: string } | null>(null);

  // Fetch live provider status list
  const loadStatuses = useCallback(async () => {
    setRefreshingAll(true);
    try {
      const [list, dlList] = await Promise.all([
        toolApiService.fetchProviderStatuses(),
        toolApiService.fetchDownloaderConfigs(),
      ]);

      const map: Record<string, ProviderStatusCard> = {};
      for (const item of list) {
        map[item.id] = item;
      }
      setLiveStatuses(map);
      setDownloaderConfigs(dlList);
    } finally {
      setRefreshingAll(false);
    }
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  // Load key when active tab changes for general providers
  useEffect(() => {
    const settings = getToolsSettings();
    const current = settings.apiProviders[activeTab];
    setApiKey(current?.apiKey || "");
    setBaseUrl(current?.baseUrl || (activeTab === "openrouter" ? "https://openrouter.ai/api/v1" : ""));
    setModel(current?.model || (activeTab === "openrouter" ? "google/gemini-2.5-flash" : ""));
    setTestResult(null);
    setShowKey(false);
  }, [activeTab]);

  // Load selected downloader provider into edit states
  useEffect(() => {
    const current = downloaderConfigs.find((c) => c.id === activeDownloaderId);
    if (current) {
      setEditDlKey("");
      setEditDlBaseUrl(current.baseUrl || "");
      setEditDlEndpoint(current.endpoint || "");
      setEditDlEnabled(current.enabled);
      setDlTestResult(null);
      setShowDlKey(false);
    }
  }, [activeDownloaderId, downloaderConfigs]);

  const handleSave = () => {
    saveApiKey(activeTab, apiKey, baseUrl, model);
    setSaveStatus(`Pengaturan ${activeTab.toUpperCase()} berhasil disimpan ke browser lokal.`);
    setTimeout(() => setSaveStatus(null), 3000);
    loadStatuses();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await toolApiService.testProviderApiKey(activeTab, apiKey, baseUrl);
      setTestResult(result);
      if (result.valid) {
        saveApiKey(activeTab, apiKey, baseUrl, model);
      }
      loadStatuses();
    } finally {
      setTesting(false);
    }
  };

  // Admin Downloader Actions
  const handleSaveDownloader = async () => {
    setSavingDl(true);
    try {
      const res = await toolApiService.saveDownloaderConfig(activeDownloaderId, {
        enabled: editDlEnabled,
        apiKey: editDlKey || undefined,
        baseUrl: editDlBaseUrl || undefined,
        endpoint: editDlEndpoint || undefined,
      });

      if (res.success) {
        setSaveStatus(`Konfigurasi ${activeDownloaderId.toUpperCase()} Downloader berhasil disimpan di server.`);
        setEditDlKey("");
        await loadStatuses();
      } else {
        alert(`Gagal menyimpan: ${res.error}`);
      }
    } finally {
      setSavingDl(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleTestDownloader = async () => {
    setTestingDl(true);
    setDlTestResult(null);
    try {
      // First save if any pending field changes
      if (editDlKey || editDlBaseUrl) {
        await toolApiService.saveDownloaderConfig(activeDownloaderId, {
          enabled: editDlEnabled,
          apiKey: editDlKey || undefined,
          baseUrl: editDlBaseUrl || undefined,
          endpoint: editDlEndpoint || undefined,
        });
      }

      const res = await toolApiService.testDownloaderProvider(activeDownloaderId);
      if (res.success) {
        setDlTestResult({ status: res.status, message: res.message });
      } else {
        setDlTestResult({ status: "error", message: res.error || "Uji koneksi gagal" });
      }
      loadStatuses();
    } finally {
      setTestingDl(false);
    }
  };

  const handleToggleDownloaderEnabled = async (id: DownloaderPlatformId, nextEnabled: boolean) => {
    await toolApiService.saveDownloaderConfig(id, { enabled: nextEnabled });
    if (id === activeDownloaderId) {
      setEditDlEnabled(nextEnabled);
    }
    loadStatuses();
  };

  const handleReset = () => {
    if (confirm("Reset seluruh konfigurasi kunci API dan preferensi Void Tools ke pengaturan awal?")) {
      resetToolsSettings();
      setApiKey("");
      setBaseUrl("");
      setTestResult(null);
      setSaveStatus("Semua konfigurasi alat telah direset.");
      setTimeout(() => setSaveStatus(null), 3000);
      loadStatuses();
    }
  };

  const filteredProviders = PROVIDER_DEFS.filter(
    (p) => selectedCategory === "all" || p.category === selectedCategory
  );

  const currentProviderInfo = PROVIDER_DEFS.find((p) => p.id === activeTab) || PROVIDER_DEFS[0];
  const currentLive = liveStatuses[activeTab];
  const currentDownloader = downloaderConfigs.find((c) => c.id === activeDownloaderId);

  // Helper for status badge
  const renderStatusBadge = (status?: string, isKeyConfigured?: boolean) => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connected</span>
          </span>
        );
      case "disabled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-gray-700/30 border border-gray-600/40 text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            <span>Disabled</span>
          </span>
        );
      case "rate_limited":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-purple-500/15 border border-purple-500/40 text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Rate Limited</span>
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-red-500/15 border border-red-500/40 text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>Error</span>
          </span>
        );
      case "missing_key":
      case "not_connected":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Not Connected</span>
          </span>
        );
    }
  };

  const totalConnected =
    Object.values(liveStatuses).filter((s) => s.status === "connected").length +
    downloaderConfigs.filter((d) => d.status === "connected").length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 font-mono">
        <Link href="/settings" className="hover:text-cyan-400 transition-colors">
          Pengaturan
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        <Link href="/settings/tools" className="hover:text-cyan-400 transition-colors">
          Void Tools Hub
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        <span className="text-[#00E5FF] font-semibold">Integrasi API & Status Provider</span>
      </nav>

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Key className="w-7 h-7 text-[#00E5FF]" />
            External API Provider & Status Manager
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Konfigurasi penyedia API terpusat untuk Downloader (Admin), AI, Image, Data, dan Developer tools di VoidVerse.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={loadStatuses}
            disabled={refreshingAll}
            className="px-3.5 py-2 rounded-xl bg-[#111827] hover:bg-gray-800 border border-white/5 text-cyan-400 text-xs font-semibold flex items-center gap-2 transition-all"
            title="Refresh Status Seluruh Provider"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingAll ? "animate-spin" : ""}`} />
            <span>Refresh Status</span>
          </button>
          <Link
            href="/settings/tools"
            className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-gray-800 border border-white/5 text-gray-300 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Tools</span>
          </Link>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#111827] border border-white/5">
          <span className="text-[11px] font-mono text-gray-400 block">Total Provider</span>
          <span className="text-xl sm:text-2xl font-black text-white">
            {PROVIDER_DEFS.length + downloaderConfigs.length} Provider
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-[#111827] border border-emerald-500/20">
          <span className="text-[11px] font-mono text-emerald-400 block">Terhubung (Live)</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400">{totalConnected} Aktif</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#111827] border border-cyan-500/20">
          <span className="text-[11px] font-mono text-cyan-400 block">Downloader Engine</span>
          <span className="text-xl sm:text-2xl font-black text-[#00E5FF]">Admin-Managed</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#111827] border border-amber-500/20">
          <span className="text-[11px] font-mono text-amber-400 block">Akses Pengguna</span>
          <span className="text-xl sm:text-2xl font-black text-amber-400">Bebas Kunci</span>
        </div>
      </div>

      {/* Admin Notice Banner */}
      <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#00E5FF] shrink-0 mt-0.5" />
        <div className="text-xs text-gray-300 leading-relaxed space-y-1">
          <span className="font-bold text-white block">Sistem Terpusat Pemilik Aplikasi (Admin-Only API Keys):</span>
          Kunci API untuk <strong>Downloader Providers</strong> (YouTube, TikTok, Instagram, SnackVideo, Terabox) dikelola langsung oleh administrator di sisi server. Pengguna akhir dapat langsung menggunakan alat unduh tanpa perlu memasukkan API key pribadi. Kunci tersimpan di backend dan tidak pernah dibocorkan ke browser client.
        </div>
      </div>

      {saveStatus && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Main Configuration Card with Category Filters */}
      <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        {/* Category Filter Pills */}
        <div className="p-4 border-b border-white/5 bg-[#080B14] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "downloader", label: "Downloader Providers (Admin)" },
            { id: "all", label: "Semua Provider Lain" },
            { id: "ai", label: "AI (OpenRouter, OpenAI, Gemini)" },
            { id: "image", label: "Image (Replicate, Remove.bg)" },
            { id: "data", label: "Data (MangaDex, AniList, Jikan)" },
            { id: "developer", label: "Developer (GitHub)" },
            { id: "custom", label: "Custom / Proxy" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#00E5FF] text-black shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                  : "bg-[#111827] text-gray-400 hover:text-white border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* VIEW 1: DOWNLOADER PROVIDERS (ADMIN CONFIGURATION)               */}
        {/* ----------------------------------------------------------------- */}
        {selectedCategory === "downloader" ? (
          <div>
            {/* Downloader Sub-tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-white/5 bg-[#080B14]">
              {downloaderConfigs.map((p) => {
                const isActive = activeDownloaderId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveDownloaderId(p.id)}
                    className={`py-3 px-3 text-xs font-bold transition-all border-b-2 text-left truncate flex flex-col gap-1 ${
                      isActive
                        ? "border-[#00E5FF] text-[#00E5FF] bg-cyan-500/10"
                        : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{p.name}</span>
                      {p.status === "connected" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-1" />
                      )}
                      {p.status === "disabled" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0 ml-1" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono truncate">{p.platformName}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Downloader Detail & Settings Form */}
            {currentDownloader && (
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-white">{currentDownloader.name}</h2>
                      {renderStatusBadge(currentDownloader.status, currentDownloader.hasKey)}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Resolusi tautan media dan unduhan otomatis untuk {currentDownloader.platformName}.
                    </p>
                    {currentDownloader.statusMessage && (
                      <p className="text-xs font-mono text-cyan-300 mt-1">
                        Status Info: {currentDownloader.statusMessage}
                      </p>
                    )}
                  </div>

                  {/* Enable / Disable Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleDownloaderEnabled(currentDownloader.id, !currentDownloader.enabled)
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                        currentDownloader.enabled
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : "bg-gray-800 border-gray-700 text-gray-400"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{currentDownloader.enabled ? "Provider Aktif" : "Provider Dinonaktifkan"}</span>
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* API Key */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-300">
                        API Key (Disimpan di Server / Admin Only)
                      </label>
                      {currentDownloader.hasKey && (
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Tersimpan di Server ({currentDownloader.maskedKey})</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showDlKey ? "text" : "password"}
                        value={editDlKey}
                        onChange={(e) => setEditDlKey(e.target.value)}
                        placeholder={
                          currentDownloader.hasKey
                            ? "Kunci tersimpan di server. Ketik di sini untuk mengganti kunci baru..."
                            : "Masukkan API Key (RapidAPI / Dedicated Service)..."
                        }
                        className="w-full bg-[#080B14] text-xs text-white placeholder-gray-600 px-4 py-3 rounded-xl border border-white/10 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono pr-12 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDlKey(!showDlKey)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      >
                        {showDlKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Kunci dirahasiakan dan disimpan aman di server. Tidak pernah dikirimkan ke peramban pengguna.
                    </span>
                  </div>

                  {/* Base URL */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      Base URL Service / Proxy Endpoint
                    </label>
                    <input
                      type="text"
                      value={editDlBaseUrl}
                      onChange={(e) => setEditDlBaseUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#080B14] text-xs text-white placeholder-gray-600 px-4 py-3 rounded-xl border border-white/10 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono transition-all"
                    />
                  </div>

                  {/* Endpoint Path */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      API Endpoint Path
                    </label>
                    <input
                      type="text"
                      value={editDlEndpoint}
                      onChange={(e) => setEditDlEndpoint(e.target.value)}
                      placeholder="/v2/video/details"
                      className="w-full bg-[#080B14] text-xs text-white placeholder-gray-600 px-4 py-3 rounded-xl border border-white/10 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono transition-all"
                    />
                  </div>
                </div>

                {/* Test Result Feedback */}
                {dlTestResult && (
                  <div
                    className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
                      dlTestResult.status === "connected"
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                        : dlTestResult.status === "rate_limited"
                        ? "bg-purple-500/15 border border-purple-500/30 text-purple-300"
                        : "bg-red-500/15 border border-red-500/30 text-red-300"
                    }`}
                  >
                    {dlTestResult.status === "connected" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <span className="font-bold block">
                        {dlTestResult.status === "connected"
                          ? "Status: Connected (Terhubung ke API)"
                          : "Status: Uji Koneksi Gagal"}
                      </span>
                      <span className="leading-relaxed">{dlTestResult.message}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={handleTestDownloader}
                    disabled={testingDl}
                    className="px-4 py-2.5 rounded-xl bg-[#080B14] hover:bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 disabled:opacity-50 flex items-center gap-2 transition-all"
                  >
                    {testingDl ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#00E5FF]" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
                    )}
                    <span>{testingDl ? "Menguji Koneksi..." : "Test Connection"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDownloader}
                    disabled={savingDl}
                    className="px-6 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black text-xs font-extrabold shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all flex items-center gap-2"
                  >
                    {savingDl && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Simpan Konfigurasi Server</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ----------------------------------------------------------------- */
          /* VIEW 2: OTHER GENERAL API PROVIDERS (AI, IMAGE, DATA, DEV, ETC.)   */
          /* ----------------------------------------------------------------- */
          <div>
            {/* Provider Tabs List */}
            <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-white/5 bg-[#080B14]">
              {filteredProviders.map((p) => {
                const isActive = activeTab === p.id;
                const live = liveStatuses[p.id];
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveTab(p.id)}
                    className={`py-3 px-3 text-xs font-bold transition-all border-b-2 text-left truncate flex flex-col gap-1 ${
                      isActive
                        ? "border-[#00E5FF] text-[#00E5FF] bg-cyan-500/10"
                        : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{p.name}</span>
                      {live?.status === "connected" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-1" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono truncate">{p.category.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Configuration Body */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-white">{currentProviderInfo.name}</h2>
                    {renderStatusBadge(currentLive?.status, currentLive?.isKeyConfigured)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{currentProviderInfo.desc}</p>
                  {currentLive?.statusMessage && (
                    <p className="text-xs font-mono text-cyan-300 mt-1">
                      Status Info: {currentLive.statusMessage}
                    </p>
                  )}
                </div>

                {currentProviderInfo.link && (
                  <a
                    href={currentProviderInfo.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono hover:underline shrink-0"
                  >
                    <span>Dokumentasi API</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Form Fields */}
              {currentProviderInfo.isPublicApi ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
                  <span className="font-bold block text-white mb-1">Provider Publik Terhubung Bebas Kunci:</span>
                  Layanan ini adalah API publik terbuka tanpa memerlukan API key rahasia. Tool Void Verse dapat langsung mengambil data metadata manga secara langsung.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-300">
                        API Key / Access Token
                      </label>
                      {currentLive?.isKeyConfigured && (
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Kunci Terkonfigurasi</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={`Masukkan ${currentProviderInfo.name} key (${currentProviderInfo.placeholder})`}
                        className="w-full bg-[#080B14] text-xs text-white placeholder-gray-600 px-4 py-3 rounded-xl border border-white/10 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono pr-12 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {activeTab === "openrouter" && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-300">
                            Base URL
                          </label>
                          <span className="text-[11px] text-cyan-400 font-mono">
                            https://openrouter.ai/api/v1
                          </span>
                        </div>
                        <input
                          type="text"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          placeholder="https://openrouter.ai/api/v1"
                          className="w-full bg-[#080B14] text-xs text-white placeholder-gray-600 px-4 py-3 rounded-xl border border-white/10 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono transition-all"
                        />
                        <span className="text-[11px] text-gray-500 mt-1 block">
                          Endpoint resmi: <code className="text-cyan-400 font-mono">https://openrouter.ai/api/v1</code> (POST /chat/completions)
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-300">
                            Default Model
                          </label>
                          <span className="text-[11px] text-cyan-400 font-mono">
                            Multi-Model Selection
                          </span>
                        </div>
                        <input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="google/gemini-2.5-flash"
                          className="w-full bg-[#080B14] text-xs text-white placeholder-gray-600 px-4 py-3 rounded-xl border border-white/10 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono transition-all mb-2"
                        />
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-gray-500 mr-1">Rekomendasi model:</span>
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
                              className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                                model === m
                                  ? "bg-cyan-500/20 text-[#00E5FF] border-cyan-500/40 shadow-[0_0_10px_rgba(0,229,255,0.2)] font-bold"
                                  : "bg-[#080B14] text-gray-400 border-white/10 hover:text-white hover:border-white/20"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {(activeTab === "custom" || activeTab === "openai") && (
                    <div>
                      <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                        Base URL (Opsional / Proxy Endpoint)
                      </label>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1 atau http://localhost:11434/v1"
                        className="w-full bg-[#080B14] text-xs text-white placeholder-gray-600 px-4 py-3 rounded-xl border border-white/10 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono transition-all"
                      />
                      <span className="text-[11px] text-gray-500 mt-1 block">
                        Kosongkan jika menggunakan endpoint resmi bawaan provider.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Test Result Feedback */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
                    testResult.valid
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                      : testResult.status === "rate_limited"
                      ? "bg-purple-500/15 border border-purple-500/30 text-purple-300"
                      : "bg-red-500/15 border border-red-500/30 text-red-300"
                  }`}
                >
                  {testResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <span className="font-bold block">
                      {testResult.valid
                        ? "Status: Connected (Terhubung)"
                        : testResult.status === "rate_limited"
                        ? "Status: Rate Limited"
                        : "Status: Koneksi Gagal"}
                    </span>
                    <span className="leading-relaxed">{testResult.message}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || (!apiKey && !currentProviderInfo.isPublicApi)}
                  className="px-4 py-2.5 rounded-xl bg-[#080B14] hover:bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#00E5FF]" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
                  )}
                  <span>{testing ? "Menguji Koneksi..." : "Uji Koneksi Provider"}</span>
                </button>

                {!currentProviderInfo.isPublicApi && (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-6 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black text-xs font-extrabold shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
                  >
                    Simpan Konfigurasi
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-[#111827] rounded-3xl border border-red-500/10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Reset Data Kunci API Lokal
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Hapus seluruh kunci API tersimpan di browser Anda dan kembalikan ke setelan default.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all shrink-0"
        >
          Reset Pengaturan Tools
        </button>
      </div>
    </div>
  );
}
