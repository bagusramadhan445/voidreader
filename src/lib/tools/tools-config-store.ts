import fs from "fs";
import path from "path";
import { ApiProviderConfig, PublicApiProviderConfig } from "./types";


const CONFIG_FILE_PATH = path.join(process.cwd(), ".void_tools_config.json");

export const DEFAULT_AI_PROVIDERS: Record<string, ApiProviderConfig> = {
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
};

function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          result[key] = val;
        }
      }
    }
  } catch (err) {
    console.error(`[ToolsConfigStore] Failed reading env file ${filePath}:`, err);
  }
  return result;
}

export class ToolsConfigStore {
  private inMemoryCache: Record<string, ApiProviderConfig> | null = null;
  private envLoaded = false;

  /**
   * Loads .env and .env.local from project root into process.env if not already present
   */
  loadEnvFiles(): void {
    if (this.envLoaded) return;
    this.envLoaded = true;

    try {
      const envLocal = parseEnvFile(path.join(process.cwd(), ".env.local"));
      const envMain = parseEnvFile(path.join(process.cwd(), ".env"));
      const merged = { ...envMain, ...envLocal };

      for (const [key, val] of Object.entries(merged)) {
        if (!process.env[key] && val) {
          process.env[key] = val;
        }
      }
    } catch (err) {
      console.warn("[ToolsConfigStore] Error loading env files:", err);
    }
  }

  private loadFromFile(): Record<string, Partial<ApiProviderConfig>> {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return parsed.apiProviders || parsed;
        }
      }
    } catch (err) {
      console.error("[ToolsConfigStore] Failed to read .void_tools_config.json:", err);
    }
    return {};
  }

  private saveToFile(providers: Record<string, ApiProviderConfig>): void {
    try {
      const data = {
        apiProviders: providers,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("[ToolsConfigStore] Failed to write .void_tools_config.json:", err);
    }
  }

  /**
   * Resolves environment variable key for standard providers
   */
  private getEnvApiKey(providerId: string): string {
    switch (providerId) {
      case "openai":
        return process.env.OPENAI_API_KEY?.trim() || "";
      case "gemini":
        return process.env.GEMINI_API_KEY?.trim() || "";
      case "openrouter":
        return process.env.OPENROUTER_API_KEY?.trim() || "";
      case "replicate":
        return process.env.REPLICATE_API_TOKEN?.trim() || "";
      case "remove_bg":
        return process.env.REMOVE_BG_API_KEY?.trim() || "";
      case "github":
        return process.env.GITHUB_TOKEN?.trim() || "";
      default:
        return "";
    }
  }

  /**
   * Resolves environment variable base URL for standard providers
   */
  private getEnvBaseUrl(providerId: string): string {
    switch (providerId) {
      case "openrouter":
        return process.env.OPENROUTER_BASE_URL?.trim() || "";
      case "openai":
        return process.env.OPENAI_BASE_URL?.trim() || "";
      default:
        return "";
    }
  }

  /**
   * Resolves environment variable default model for standard providers
   */
  private getEnvModel(providerId: string): string {
    switch (providerId) {
      case "openrouter":
        return process.env.OPENROUTER_MODEL?.trim() || "";
      case "openai":
        return process.env.OPENAI_MODEL?.trim() || "";
      case "gemini":
        return process.env.GEMINI_MODEL?.trim() || "";
      default:
        return "";
    }
  }

  /**
   * Returns all provider configurations merged from defaults, server file, and environment
   */
  getAllProviders(): Record<string, ApiProviderConfig> {
    this.loadEnvFiles();

    if (this.inMemoryCache) {
      return this.inMemoryCache;
    }

    const fileData = this.loadFromFile();
    const result: Record<string, ApiProviderConfig> = {};

    for (const [id, def] of Object.entries(DEFAULT_AI_PROVIDERS)) {
      const saved = fileData[id] || {};
      const envKey = this.getEnvApiKey(id);
      const envBase = this.getEnvBaseUrl(id);
      const envModel = this.getEnvModel(id);

      const resolvedApiKey = envKey || saved.apiKey || def.apiKey || "";
      const resolvedBaseUrl = envBase || saved.baseUrl || def.baseUrl;
      const resolvedModel = envModel || saved.model || def.model;
      const resolvedEnabled = Boolean(
        envKey || saved.enabled || (def.enabled && !def.apiKey)
      );

      result[id] = {
        ...def,
        ...saved,
        apiKey: resolvedApiKey,
        baseUrl: resolvedBaseUrl,
        model: resolvedModel,
        enabled: resolvedEnabled,
      };
    }

    // Preserve any custom providers saved in file
    for (const [id, val] of Object.entries(fileData)) {
      if (!result[id] && val && typeof val === "object") {
        result[id] = val as ApiProviderConfig;
      }
    }

    this.inMemoryCache = result;
    return result;
  }

  /**
   * Returns configuration for a specific provider
   */
  getProviderConfig(providerId: string): ApiProviderConfig | undefined {
    const all = this.getAllProviders();
    return all[providerId];
  }

  /**
   * Returns API key for a provider
   */
  getApiKey(providerId: string): string {
    const cfg = this.getProviderConfig(providerId);
    return cfg?.apiKey?.trim() || "";
  }

  /**
   * Saves or updates a provider's configuration
   */
  saveApiKey(
    providerId: string,
    apiKey: string,
    baseUrl?: string,
    model?: string,
    enabled?: boolean
  ): ApiProviderConfig {
    const all = { ...this.getAllProviders() };
    const current = all[providerId] || {
      providerId,
      providerName: providerId.toUpperCase(),
      apiKey: "",
      enabled: false,
    };

    const trimmedKey = apiKey.trim();
    const updated: ApiProviderConfig = {
      ...current,
      apiKey: trimmedKey,
      baseUrl: baseUrl?.trim() || current.baseUrl,
      model: model?.trim() || current.model,
      enabled: enabled !== undefined ? enabled : Boolean(trimmedKey),
      lastTested: Date.now(),
      status: trimmedKey ? "valid" : "untested",
    };

    all[providerId] = updated;
    this.inMemoryCache = all;
    this.saveToFile(all);

    return updated;
  }

  /**
   * Returns a map of all non-empty API keys and provider metadata
   */
  getApiKeysMap(): Record<string, string> {
    const providers = this.getAllProviders();
    const map: Record<string, string> = {};

    for (const [id, cfg] of Object.entries(providers)) {
      const key = cfg.apiKey?.trim();
      if (key && (cfg.enabled || key.length > 0)) {
        map[id] = key;
        if (cfg.baseUrl) map[`${id}_base_url`] = cfg.baseUrl;
        if (cfg.model) map[`${id}_model`] = cfg.model;
      }
    }

    return map;
  }

  /**
   * Returns a sanitized public view of provider configs – no secrets/api keys are exposed.
   * Exposes only safe metadata: providerId, providerName, isConfigured (boolean), baseUrl, model, enabled, status, lastTested.
   */
  getPublicProvidersConfig(): Record<string, PublicApiProviderConfig> {
    const all = this.getAllProviders();
    const publicMap: Record<string, PublicApiProviderConfig> = {};
    for (const [id, cfg] of Object.entries(all)) {
      publicMap[id] = {
        providerId: cfg.providerId,
        providerName: cfg.providerName,
        isConfigured: Boolean(cfg.apiKey?.trim()),
        baseUrl: cfg.baseUrl,
        model: cfg.model,
        enabled: Boolean(cfg.enabled),
        status: cfg.status,
        lastTested: cfg.lastTested,
      };
    }
    return publicMap;
  }

  /**
   * Clears in-memory cache to force re-reading from disk/env
   */
  invalidateCache(): void {
    this.inMemoryCache = null;
    this.envLoaded = false;
  }
}

export const toolsConfigStore = new ToolsConfigStore();
