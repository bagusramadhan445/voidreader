import { ApiProviderConfig, VoidToolsSettings } from "./types";

const STORAGE_KEY = "voidverse_tools_settings_v1";

const DEFAULT_SETTINGS: VoidToolsSettings = {
  favoriteToolIds: [
    "ai-chat-assistant",
    "manga-downloader",
    "web-scraper",
    "image-compressor",
    "qr-code-generator",
    "json-formatter",
    "uuid-generator",
    "password-generator",
  ],
  recentToolIds: [],
  apiProviders: {
    openai: {
      providerId: "openai",
      providerName: "OpenAI (GPT-4o, DALL-E)",
      apiKey: "",
      model: "gpt-4o-mini",
      enabled: false,
    },
    replicate: {
      providerId: "replicate",
      providerName: "Replicate (Flux, SDXL, Background Removal)",
      apiKey: "",
      enabled: false,
    },
    gemini: {
      providerId: "gemini",
      providerName: "Google Gemini 1.5 Flash / Pro",
      apiKey: "",
      model: "gemini-1.5-flash",
      enabled: false,
    },
    openrouter: {
      providerId: "openrouter",
      providerName: "OpenRouter (Gemini, DeepSeek, Llama, GPT)",
      apiKey: "",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "google/gemini-2.5-flash",
      enabled: false,
    },
    remove_bg: {
      providerId: "remove_bg",
      providerName: "Remove.bg API (Penghapus Background)",
      apiKey: "",
      enabled: false,
    },
    github: {
      providerId: "github",
      providerName: "GitHub API (Token Personal)",
      apiKey: "",
      enabled: false,
    },
    mangadex: {
      providerId: "mangadex",
      providerName: "MangaDex API (Katalog Global)",
      apiKey: "",
      enabled: true,
      status: "connected",
    },
    anilist: {
      providerId: "anilist",
      providerName: "AniList GraphQL (Database Manga)",
      apiKey: "",
      enabled: true,
      status: "connected",
    },
    jikan: {
      providerId: "jikan",
      providerName: "Jikan API (MyAnimeList)",
      apiKey: "",
      enabled: true,
      status: "connected",
    },
    custom: {
      providerId: "custom",
      providerName: "Custom Webhook / Self-Hosted Proxy",
      apiKey: "",
      baseUrl: "",
      enabled: false,
    },
  },
  themeAccent: "cyan",
  autoCopyResults: true,
};

export function getToolsSettings(): VoidToolsSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      apiProviders: {
        ...DEFAULT_SETTINGS.apiProviders,
        ...(parsed.apiProviders || {}),
      },
    };
  } catch (err) {
    console.error("Failed to read Void Tools settings:", err);
    return DEFAULT_SETTINGS;
  }
}

export function saveToolsSettings(settings: Partial<VoidToolsSettings>): void {
  if (typeof window === "undefined") return;
  try {
    const current = getToolsSettings();
    const updated = {
      ...current,
      ...settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("void_tools_settings_changed", { detail: updated }));
  } catch (err) {
    console.error("Failed to save Void Tools settings:", err);
  }
}

export function saveApiKey(
  providerId: string,
  apiKey: string,
  baseUrl?: string,
  model?: string
): void {
  const settings = getToolsSettings();
  const provider = settings.apiProviders[providerId] || {
    providerId,
    providerName: providerId.toUpperCase(),
    apiKey: "",
    enabled: false,
  };

  const updatedProvider = {
    ...provider,
    apiKey: apiKey.trim(),
    baseUrl: baseUrl?.trim(),
    model: model?.trim() || provider.model,
    enabled: Boolean(apiKey.trim()),
    lastTested: Date.now(),
    status: (apiKey.trim() ? "valid" : "untested") as any,
  };

  settings.apiProviders[providerId] = updatedProvider;
  saveToolsSettings({ apiProviders: settings.apiProviders });

  // Sync with server storage so backend routes and test CLI have immediate access
  if (typeof window !== "undefined") {
    fetch("/api/tools/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl?.trim(),
        model: model?.trim() || provider.model,
        enabled: Boolean(apiKey.trim()),
      }),
    }).catch((err) => {
      console.warn("[storage] Failed to sync API key to server:", err);
    });
  }
}

export function toggleFavoriteTool(toolId: string): boolean {
  const settings = getToolsSettings();
  const exists = settings.favoriteToolIds.includes(toolId);
  const updated = exists
    ? settings.favoriteToolIds.filter((id) => id !== toolId)
    : [...settings.favoriteToolIds, toolId];

  saveToolsSettings({ favoriteToolIds: updated });
  return !exists;
}

export function recordRecentTool(toolId: string): void {
  const settings = getToolsSettings();
  const filtered = settings.recentToolIds.filter((id) => id !== toolId);
  const updated = [toolId, ...filtered].slice(0, 10);
  saveToolsSettings({ recentToolIds: updated });
}

export function getApiKeysMap(): Record<string, string> {
  const settings = getToolsSettings();
  const map: Record<string, string> = {};
  for (const [key, config] of Object.entries(settings.apiProviders)) {
    if (config.apiKey && config.enabled) {
      map[key] = config.apiKey;
      if (config.baseUrl) map[`${key}_base_url`] = config.baseUrl;
      if (config.model) map[`${key}_model`] = config.model;
    }
  }
  return map;
}

export function resetToolsSettings(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("void_tools_settings_changed", { detail: DEFAULT_SETTINGS })
    );
  } catch (err) {
    console.error("Failed to reset Void Tools settings:", err);
  }
}

