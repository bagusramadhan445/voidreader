import {
  DownloaderAdapter,
  DownloaderPlatformId,
  DownloaderProviderConfig,
  DownloaderProviderStatus,
  DownloaderResult,
  ClientDownloaderProviderConfig,
} from "./types";
import { youTubeAdapter } from "./youtube-adapter";
import { tikTokAdapter } from "./tiktok-adapter";
import { instagramAdapter } from "./instagram-adapter";
import { snackVideoAdapter } from "./snackvideo-adapter";
import { teraboxAdapter } from "./terabox-adapter";
import { downloaderConfigStore } from "./config-store";
import { downloaderProvider } from "./downloader-provider";

export class DownloaderProviderManager {
  private adapters: Map<DownloaderPlatformId, DownloaderAdapter> = new Map();

  constructor() {
    this.registerAdapter(youTubeAdapter);
    this.registerAdapter(tikTokAdapter);
    this.registerAdapter(instagramAdapter);
    this.registerAdapter(snackVideoAdapter);
    this.registerAdapter(teraboxAdapter);
  }

  /**
   * Register a new downloader provider adapter dynamically
   */
  registerAdapter(adapter: DownloaderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(id: DownloaderPlatformId): DownloaderAdapter | undefined {
    return this.adapters.get(id);
  }

  getAllAdapters(): DownloaderAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Tests connection for a specific downloader provider
   */
  async testProvider(
    id: DownloaderPlatformId
  ): Promise<{ status: DownloaderProviderStatus; message: string }> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return { status: "error", message: `Adapter untuk ${id} tidak ditemukan.` };
    }

    const config = downloaderConfigStore.getConfig(id);
    const result = await adapter.testConnection(config);

    // Save evaluated status
    downloaderConfigStore.updateConfig(id, {
      status: result.status,
      statusMessage: result.message,
      lastTested: Date.now(),
    });

    return result;
  }

  /**
   * Core Downloader Pipeline:
   * User -> Void Downloader Tool -> Downloader Provider Manager -> Selected API Provider -> External Downloader API -> Response Handler -> Download Result
   */
  async resolveDownload(url: string): Promise<DownloaderResult> {
    if (!url.trim()) {
      return {
        success: false,
        platform: "Unknown",
        sourceUrl: url,
        title: "",
        qualities: [],
        error: "URL tidak boleh kosong.",
      };
    }

    // 1. Find matching specialized adapter (YouTube, TikTok, Instagram, SnackVideo, Terabox)
    for (const adapter of this.adapters.values()) {
      if (adapter.matchesUrl(url)) {
        const config = downloaderConfigStore.getConfig(adapter.id);

        if (!config.enabled) {
          return {
            success: false,
            platform: adapter.platformName,
            sourceUrl: url,
            title: adapter.name,
            qualities: [],
            error: `Layanan ${adapter.name} dinonaktifkan oleh Administrator. Hubungi admin untuk mengaktifkan kembali.`,
          };
        }

        // Execute adapter with timeout & response handling
        return await adapter.resolve(url, config);
      }
    }

    // 2. Generic direct media stream probe fallback (MP4, MKV, ZIP, Web streams)
    try {
      const inspect = await downloaderProvider.inspectUrl(url);

      const qualities = [];
      if (inspect.mediaStreams && inspect.mediaStreams.length > 0) {
        for (const s of inspect.mediaStreams) {
          qualities.push({
            label: `Direct Stream (${s.type.toUpperCase()})`,
            url: s.url,
            format: "mp4",
          });
        }
      }

      qualities.push({
        label: `Direct Download (${inspect.contentType})`,
        url: inspect.finalUrl,
        sizeFormatted: inspect.contentLengthFormatted,
        format: inspect.fileName?.split(".").pop() || "bin",
      });

      return {
        success: true,
        platform: "Direct Media",
        sourceUrl: url,
        title: inspect.pageTitle || inspect.fileName || "Direct Media Stream",
        fileName: inspect.fileName,
        qualities,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tidak dapat mengekstrak media";
      return {
        success: false,
        platform: "Direct Media",
        sourceUrl: url,
        title: "",
        qualities: [],
        error: `Gagal memproses URL: ${msg}`,
      };
    }
  }

  getClientConfigs(): ClientDownloaderProviderConfig[] {
    return downloaderConfigStore.getClientConfigs();
  }

  saveConfig(
    id: DownloaderPlatformId,
    updates: Partial<DownloaderProviderConfig>
  ): ClientDownloaderProviderConfig {
    downloaderConfigStore.updateConfig(id, updates);
    return downloaderConfigStore.getClientConfigs().find((c) => c.id === id)!;
  }
}

export const downloaderProviderManager = new DownloaderProviderManager();
