import fs from "fs";
import path from "path";
import {
  DownloaderPlatformId,
  DownloaderProviderConfig,
  ClientDownloaderProviderConfig,
} from "./types";

const CONFIG_FILE_PATH = path.join(process.cwd(), ".downloader_provider_config.json");

export const DEFAULT_DOWNLOADER_CONFIGS: Record<DownloaderPlatformId, DownloaderProviderConfig> = {
  youtube: {
    id: "youtube",
    name: "YouTube Downloader API",
    platformName: "YouTube & Shorts",
    enabled: true,
    apiKey: "",
    baseUrl: "https://youtube-media-downloader.p.rapidapi.com",
    endpoint: "/v2/video/details",
    authHeaderName: "X-RapidAPI-Key",
    status: "untested",
    statusMessage: "Menunggu pengujian koneksi",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok Downloader API",
    platformName: "TikTok Video & Music",
    enabled: true,
    apiKey: "",
    baseUrl: "https://www.tikwm.com",
    endpoint: "/api/",
    authHeaderName: "X-RapidAPI-Key",
    status: "connected",
    statusMessage: "Terhubung via TikWM Engine bawaan",
  },
  instagram: {
    id: "instagram",
    name: "Instagram Downloader API",
    platformName: "Instagram Reels & Videos",
    enabled: true,
    apiKey: "",
    baseUrl: "https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com",
    endpoint: "/index",
    authHeaderName: "X-RapidAPI-Key",
    status: "untested",
    statusMessage: "Menunggu pengujian koneksi",
  },
  snackvideo: {
    id: "snackvideo",
    name: "SnackVideo Downloader API",
    platformName: "SnackVideo Clip",
    enabled: true,
    apiKey: "",
    baseUrl: "https://snackvideo-downloader.p.rapidapi.com",
    endpoint: "/video",
    authHeaderName: "X-RapidAPI-Key",
    status: "untested",
    statusMessage: "Menunggu pengujian koneksi",
  },
  terabox: {
    id: "terabox",
    name: "Terabox Resolver API",
    platformName: "Terabox Direct Download",
    enabled: true,
    apiKey: "",
    baseUrl: "https://terabox-downloader-direct-download-link-generator.p.rapidapi.com",
    endpoint: "/url",
    authHeaderName: "X-RapidAPI-Key",
    status: "untested",
    statusMessage: "Menunggu pengujian koneksi",
  },
};

class DownloaderConfigStore {
  private inMemoryCache: Record<DownloaderPlatformId, DownloaderProviderConfig> | null = null;

  private loadFromFile(): Record<DownloaderPlatformId, Partial<DownloaderProviderConfig>> {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("[DownloaderConfigStore] Failed to read config file:", err);
    }
    return {} as Record<DownloaderPlatformId, Partial<DownloaderProviderConfig>>;
  }

  private saveToFile(data: Record<DownloaderPlatformId, DownloaderProviderConfig>): void {
    try {
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("[DownloaderConfigStore] Failed to write config file:", err);
    }
  }

  private getEnvKey(id: DownloaderPlatformId): string {
    switch (id) {
      case "youtube":
        return process.env.YOUTUBE_DOWNLOADER_API_KEY?.trim() || "";
      case "tiktok":
        return process.env.TIKTOK_DOWNLOADER_API_KEY?.trim() || "";
      case "instagram":
        return process.env.INSTAGRAM_DOWNLOADER_API_KEY?.trim() || "";
      case "snackvideo":
        return process.env.SNACKVIDEO_DOWNLOADER_API_KEY?.trim() || "";
      case "terabox":
        return process.env.TERABOX_RESOLVER_API_KEY?.trim() || "";
    }
  }

  private getEnvBaseUrl(id: DownloaderPlatformId): string {
    switch (id) {
      case "youtube":
        return process.env.YOUTUBE_DOWNLOADER_BASE_URL?.trim() || "";
      case "tiktok":
        return process.env.TIKTOK_DOWNLOADER_BASE_URL?.trim() || "";
      case "instagram":
        return process.env.INSTAGRAM_DOWNLOADER_BASE_URL?.trim() || "";
      case "snackvideo":
        return process.env.SNACKVIDEO_DOWNLOADER_BASE_URL?.trim() || "";
      case "terabox":
        return process.env.TERABOX_RESOLVER_BASE_URL?.trim() || "";
    }
  }

  getAllConfigs(): Record<DownloaderPlatformId, DownloaderProviderConfig> {
    if (this.inMemoryCache) return this.inMemoryCache;

    const fileData = this.loadFromFile();
    const result: Record<DownloaderPlatformId, DownloaderProviderConfig> = { ...DEFAULT_DOWNLOADER_CONFIGS };

    for (const key of Object.keys(DEFAULT_DOWNLOADER_CONFIGS) as DownloaderPlatformId[]) {
      const def = DEFAULT_DOWNLOADER_CONFIGS[key];
      const saved = fileData[key] || {};
      const envKey = this.getEnvKey(key);
      const envBase = this.getEnvBaseUrl(key);

      result[key] = {
        ...def,
        ...saved,
        apiKey: envKey || saved.apiKey || def.apiKey,
        baseUrl: envBase || saved.baseUrl || def.baseUrl,
      };
    }

    this.inMemoryCache = result;
    return result;
  }

  getConfig(id: DownloaderPlatformId): DownloaderProviderConfig {
    const all = this.getAllConfigs();
    return all[id] || DEFAULT_DOWNLOADER_CONFIGS[id];
  }

  updateConfig(
    id: DownloaderPlatformId,
    updates: Partial<DownloaderProviderConfig>
  ): DownloaderProviderConfig {
    const all = this.getAllConfigs();
    const current = all[id] || DEFAULT_DOWNLOADER_CONFIGS[id];

    // If apiKey is provided as blank or not changed, keep current
    let updatedApiKey = current.apiKey;
    if (updates.apiKey !== undefined && updates.apiKey.trim() !== "" && updates.apiKey !== "********") {
      updatedApiKey = updates.apiKey.trim();
    }

    const nextConfig: DownloaderProviderConfig = {
      ...current,
      ...updates,
      apiKey: updatedApiKey,
    };

    all[id] = nextConfig;
    this.inMemoryCache = all;
    this.saveToFile(all);

    return nextConfig;
  }

  getClientConfigs(): ClientDownloaderProviderConfig[] {
    const all = this.getAllConfigs();
    return (Object.keys(all) as DownloaderPlatformId[]).map((key) => {
      const c = all[key];
      const hasKey = Boolean(c.apiKey);
      const maskedKey = hasKey ? "••••••••" + (c.apiKey.length > 4 ? c.apiKey.slice(-4) : "") : "";

      let status = c.status || "untested";
      if (!c.enabled) {
        status = "disabled";
      } else if (!hasKey && key !== "tiktok") {
        status = "not_connected";
      }

      return {
        id: c.id,
        name: c.name,
        platformName: c.platformName,
        enabled: c.enabled,
        hasKey,
        maskedKey,
        baseUrl: c.baseUrl,
        endpoint: c.endpoint,
        authHeaderName: c.authHeaderName,
        status,
        statusMessage: c.statusMessage || (status === "connected" ? "Terhubung" : "Belum Terhubung"),
        lastTested: c.lastTested,
      };
    });
  }
}

export const downloaderConfigStore = new DownloaderConfigStore();
