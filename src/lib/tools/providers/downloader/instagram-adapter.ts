import * as cheerio from "cheerio";
import {
  DownloaderAdapter,
  DownloaderPlatformId,
  DownloaderProviderConfig,
  DownloaderProviderStatus,
  DownloaderResult,
} from "./types";

export class InstagramAdapter implements DownloaderAdapter {
  readonly id: DownloaderPlatformId = "instagram";
  readonly name = "Instagram Downloader API";
  readonly platformName = "Instagram Reels & Videos";
  readonly defaultBaseUrl = "https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com";
  readonly defaultEndpoint = "/index";
  readonly defaultAuthHeader = "X-RapidAPI-Key";

  matchesUrl(url: string): boolean {
    return /(?:instagram\.com\/(?:p|reel|reels|tv)\/)/i.test(url);
  }

  async testConnection(
    config: DownloaderProviderConfig
  ): Promise<{ status: DownloaderProviderStatus; message: string }> {
    if (!config.enabled) {
      return { status: "disabled", message: "Provider Instagram Downloader dinonaktifkan." };
    }

    const key = config.apiKey || process.env.INSTAGRAM_DOWNLOADER_API_KEY || "";
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
        return { status: "connected", message: "Terhubung ke Instagram Downloader API." };
      }
      if (res.status === 429) {
        return { status: "rate_limited", message: "Batas rate limit Instagram API tercapai (HTTP 429)." };
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
    const key = config.apiKey || process.env.INSTAGRAM_DOWNLOADER_API_KEY || "";
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
          const data = json.data || json.result || json;
          const mediaUrl = data.media || data.video_url || data.download_url || data.url;

          if (mediaUrl) {
            return {
              success: true,
              platform: "Instagram",
              sourceUrl: url,
              title: data.title || data.caption || "Instagram Media",
              author: data.owner?.username || data.author || "",
              thumbnail: data.thumbnail || data.display_url,
              qualities: [
                {
                  label: "HD Video (Direct MP4)",
                  url: mediaUrl,
                  format: "mp4",
                },
              ],
              fileName: `instagram_${Date.now()}.mp4`,
            };
          }
        }
      } catch {
        // fallback to OpenGraph inspection below
      }
    }

    // 2. OpenGraph & HTML fallback probe
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);

        const videoUrl = $('meta[property="og:video"]').attr("content") || $('meta[property="og:video:secure_url"]').attr("content");
        const title = $('meta[property="og:title"]').attr("content") || "Instagram Reel";
        const thumbnail = $('meta[property="og:image"]').attr("content");

        if (videoUrl) {
          return {
            success: true,
            platform: "Instagram",
            sourceUrl: url,
            title,
            thumbnail,
            qualities: [
              {
                label: "MP4 Video (Direct Stream)",
                url: videoUrl,
                format: "mp4",
              },
            ],
            fileName: "instagram_reel.mp4",
          };
        }
      }
    } catch {
      // ignore
    }

    return {
      success: false,
      platform: "Instagram",
      sourceUrl: url,
      title: "Instagram Reel",
      qualities: [],
      error:
        "Instagram Downloader API Key belum dikonfigurasi oleh Administrator. Silakan atur di Settings -> Void Tools -> API Configuration -> Downloader Providers.",
    };
  }
}

export const instagramAdapter = new InstagramAdapter();
