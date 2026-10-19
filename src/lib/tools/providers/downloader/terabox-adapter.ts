import {
  DownloaderAdapter,
  DownloaderPlatformId,
  DownloaderProviderConfig,
  DownloaderProviderStatus,
  DownloaderResult,
} from "./types";

export class TeraboxAdapter implements DownloaderAdapter {
  readonly id: DownloaderPlatformId = "terabox";
  readonly name = "Terabox Resolver API";
  readonly platformName = "Terabox Cloud Direct Link";
  readonly defaultBaseUrl = "https://terabox-downloader-direct-download-link-generator.p.rapidapi.com";
  readonly defaultEndpoint = "/url";
  readonly defaultAuthHeader = "X-RapidAPI-Key";

  matchesUrl(url: string): boolean {
    return /(?:terabox\.com|teraboxapp\.com|1024tera\.com|mirrobox\.com|nephobox\.com|freeterabox\.com)/i.test(
      url
    );
  }

  async testConnection(
    config: DownloaderProviderConfig
  ): Promise<{ status: DownloaderProviderStatus; message: string }> {
    if (!config.enabled) {
      return { status: "disabled", message: "Provider Terabox Resolver dinonaktifkan." };
    }

    const key = config.apiKey || process.env.TERABOX_RESOLVER_API_KEY || "";
    if (!key) {
      return { status: "not_connected", message: "API Key belum diatur (Admin only)." };
    }

    const base = config.baseUrl || this.defaultBaseUrl;

    try {
      const res = await fetch(`${base}`, {
        method: "HEAD",
        headers: {
          [config.authHeaderName || this.defaultAuthHeader]: key,
          "User-Agent": "VoidVerse-Downloader/2.0",
        },
        signal: AbortSignal.timeout(8000),
      }).catch(async () => {
        return await fetch(`${base}`, {
          headers: {
            [config.authHeaderName || this.defaultAuthHeader]: key,
            "User-Agent": "VoidVerse-Downloader/2.0",
          },
          signal: AbortSignal.timeout(8000),
        });
      });

      if (res.status === 200 || res.status === 404 || res.status === 405) {
        return { status: "connected", message: "Terhubung ke Terabox Resolver API." };
      }
      if (res.status === 429) {
        return { status: "rate_limited", message: "Batas rate limit Terabox API tercapai (HTTP 429)." };
      }
      if (res.status === 401 || res.status === 403) {
        return { status: "error", message: `Otorisasi gagal (HTTP ${res.status}). Periksa API Key.` };
      }

      return { status: "connected", message: `Status HTTP ${res.status} OK.` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal terhubung";
      return { status: "error", message: `Koneksi gagal: ${msg}` };
    }
  }

  async resolve(url: string, config: DownloaderProviderConfig): Promise<DownloaderResult> {
    const key = config.apiKey || process.env.TERABOX_RESOLVER_API_KEY || "";
    const base = config.baseUrl || this.defaultBaseUrl;
    const endpoint = config.endpoint || this.defaultEndpoint;

    if (!key) {
      return {
        success: false,
        platform: "Terabox",
        sourceUrl: url,
        title: "Terabox Cloud File",
        qualities: [],
        error:
          "Terabox Resolver API Key belum dikonfigurasi oleh Administrator. Silakan atur di Settings -> Void Tools -> API Configuration -> Downloader Providers.",
      };
    }

    try {
      const targetUrl = `${base}${endpoint}?url=${encodeURIComponent(url)}`;
      const res = await fetch(targetUrl, {
        headers: {
          [config.authHeaderName || this.defaultAuthHeader]: key,
          "User-Agent": "VoidVerse-Downloader/2.0",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`Terabox Resolver HTTP Error ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const files = Array.isArray(json) ? json : json.files || json.list || [json];
      const primary = files[0] || json;

      const directLink = primary.dlink || primary.direct_link || primary.download_link || primary.url;
      const fileName = primary.file_name || primary.name || "terabox_download";
      const sizeFormatted = primary.size_formatted || primary.size;
      const thumbnail = primary.thumb || primary.thumbnail;

      if (!directLink) {
        throw new Error("API tidak menghasilkan direct download link untuk tautan Terabox ini.");
      }

      return {
        success: true,
        platform: "Terabox",
        sourceUrl: url,
        title: fileName,
        fileName,
        thumbnail,
        qualities: [
          {
            label: "Fast Direct Download (CDN)",
            url: directLink,
            sizeFormatted,
            format: fileName.split(".").pop() || "bin",
          },
        ],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
      return {
        success: false,
        platform: "Terabox",
        sourceUrl: url,
        title: "Terabox File",
        qualities: [],
        error: `Gagal me-resolve tautan Terabox: ${msg}`,
      };
    }
  }
}

export const teraboxAdapter = new TeraboxAdapter();
