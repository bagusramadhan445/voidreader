import * as cheerio from "cheerio";
import {
  DownloaderAdapter,
  DownloaderPlatformId,
  DownloaderProviderConfig,
  DownloaderProviderStatus,
  DownloaderResult,
} from "./types";

export class SnackVideoAdapter implements DownloaderAdapter {
  readonly id: DownloaderPlatformId = "snackvideo";
  readonly name = "SnackVideo Downloader API";
  readonly platformName = "SnackVideo (Tanpa Watermark)";
  readonly defaultBaseUrl = "https://snackvideo-downloader.p.rapidapi.com";
  readonly defaultEndpoint = "/video";
  readonly defaultAuthHeader = "X-RapidAPI-Key";

  matchesUrl(url: string): boolean {
    return /(?:snackvideo\.com|sck\.io)/i.test(url);
  }

  async testConnection(
    config: DownloaderProviderConfig
  ): Promise<{ status: DownloaderProviderStatus; message: string }> {
    if (!config.enabled) {
      return { status: "disabled", message: "Provider SnackVideo Downloader dinonaktifkan." };
    }

    const key = config.apiKey || process.env.SNACKVIDEO_DOWNLOADER_API_KEY || "";
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
        return { status: "connected", message: "Terhubung ke SnackVideo Downloader API." };
      }
      if (res.status === 429) {
        return { status: "rate_limited", message: "Batas rate limit SnackVideo API tercapai (HTTP 429)." };
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
    const key = config.apiKey || process.env.SNACKVIDEO_DOWNLOADER_API_KEY || "";
    const base = config.baseUrl || this.defaultBaseUrl;
    const endpoint = config.endpoint || this.defaultEndpoint;

    // 1. If API Key is present, call configured API
    if (key) {
      try {
        const targetUrl = `${base}${endpoint}?url=${encodeURIComponent(url)}`;
        const res = await fetch(targetUrl, {
          headers: {
            [config.authHeaderName || this.defaultAuthHeader]: key,
            "User-Agent": "VoidVerse-Downloader/2.0",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          const mediaUrl = data.video || data.video_url || data.download_url || data.url;

          if (mediaUrl) {
            return {
              success: true,
              platform: "SnackVideo",
              sourceUrl: url,
              title: data.title || data.caption || "SnackVideo Clip",
              author: data.author || data.user_name || "",
              thumbnail: data.thumbnail || data.cover,
              qualities: [
                {
                  label: "HD Tanpa Watermark (MP4)",
                  url: mediaUrl,
                  format: "mp4",
                },
              ],
              fileName: `snackvideo_${Date.now()}.mp4`,
            };
          }
        }
      } catch {
        // fallback
      }
    }

    // 2. Direct mobile page probe (follow redirect from sck.io)
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);

        const videoUrl = $('video source').attr('src') || $('video').attr('src') || $('meta[property="og:video"]').attr("content");
        const title = $('meta[property="og:title"]').attr("content") || "SnackVideo Clip";
        const thumbnail = $('meta[property="og:image"]').attr("content");

        if (videoUrl) {
          return {
            success: true,
            platform: "SnackVideo",
            sourceUrl: url,
            title,
            thumbnail,
            qualities: [
              {
                label: "Direct MP4 Video",
                url: videoUrl,
                format: "mp4",
              },
            ],
            fileName: "snackvideo.mp4",
          };
        }
      }
    } catch {
      // ignore
    }

    return {
      success: false,
      platform: "SnackVideo",
      sourceUrl: url,
      title: "SnackVideo",
      qualities: [],
      error:
        "SnackVideo API Key belum dikonfigurasi oleh Administrator. Silakan atur di Settings -> Void Tools -> API Configuration -> Downloader Providers.",
    };
  }
}

export const snackVideoAdapter = new SnackVideoAdapter();
