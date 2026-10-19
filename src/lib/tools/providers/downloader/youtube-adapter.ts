import {
  DownloaderAdapter,
  DownloaderPlatformId,
  DownloaderProviderConfig,
  DownloaderProviderStatus,
  DownloaderResult,
} from "./types";

export class YouTubeAdapter implements DownloaderAdapter {
  readonly id: DownloaderPlatformId = "youtube";
  readonly name = "YouTube Downloader API";
  readonly platformName = "YouTube & YouTube Shorts";
  readonly defaultBaseUrl = "https://youtube-media-downloader.p.rapidapi.com";
  readonly defaultEndpoint = "/v2/video/details";
  readonly defaultAuthHeader = "X-RapidAPI-Key";

  matchesUrl(url: string): boolean {
    return /(?:youtube\.com\/(?:watch\?|shorts\/|embed\/)|youtu\.be\/)/i.test(url);
  }

  private extractVideoId(url: string): string | null {
    const match = url.match(/(?:watch\?v=|shorts\/|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : null;
  }

  async testConnection(
    config: DownloaderProviderConfig
  ): Promise<{ status: DownloaderProviderStatus; message: string }> {
    if (!config.enabled) {
      return { status: "disabled", message: "Provider YouTube Downloader dinonaktifkan." };
    }

    if (!config.apiKey && !process.env.YOUTUBE_DOWNLOADER_API_KEY) {
      return { status: "not_connected", message: "API Key belum diatur (Admin only)." };
    }

    const key = config.apiKey || process.env.YOUTUBE_DOWNLOADER_API_KEY || "";
    const base = config.baseUrl || this.defaultBaseUrl;

    try {
      // Test ping to base URL or probe video
      const res = await fetch(`${base}${config.endpoint || this.defaultEndpoint}?videoId=dQw4w9WgXcQ`, {
        headers: {
          [config.authHeaderName || this.defaultAuthHeader]: key,
          "User-Agent": "VoidVerse-Downloader/2.0",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (res.status === 200) {
        return { status: "connected", message: "Terhubung ke YouTube Downloader API (200 OK)." };
      }
      if (res.status === 429) {
        return { status: "rate_limited", message: "Batas kuota/rate limit YouTube API tercapai (HTTP 429)." };
      }
      if (res.status === 401 || res.status === 403) {
        return { status: "error", message: `Otorisasi gagal (HTTP ${res.status}). Periksa kembali API Key.` };
      }

      return { status: "connected", message: `Endpoint merespons status HTTP ${res.status}.` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal terhubung";
      return { status: "error", message: `Koneksi gagal: ${msg}` };
    }
  }

  async resolve(url: string, config: DownloaderProviderConfig): Promise<DownloaderResult> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      return {
        success: false,
        platform: "YouTube",
        sourceUrl: url,
        title: "",
        qualities: [],
        error: "URL YouTube tidak valid. Mohon sertakan tautan video atau shorts yang valid.",
      };
    }

    const key = config.apiKey || process.env.YOUTUBE_DOWNLOADER_API_KEY || "";
    const base = config.baseUrl || this.defaultBaseUrl;
    const endpoint = config.endpoint || this.defaultEndpoint;

    // 1. Fetch public oEmbed info as fallback/metadata
    let oEmbedTitle = "YouTube Video";
    let oEmbedAuthor = "";
    const oEmbedThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    try {
      const oEmbedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (oEmbedRes.ok) {
        const oe = await oEmbedRes.json();
        oEmbedTitle = oe.title || oEmbedTitle;
        oEmbedAuthor = oe.author_name || "";
      }
    } catch {
      // ignore oEmbed error
    }

    if (!key) {
      return {
        success: false,
        platform: "YouTube",
        sourceUrl: url,
        title: oEmbedTitle,
        author: oEmbedAuthor,
        thumbnail: oEmbedThumbnail,
        qualities: [],
        error:
          "YouTube Downloader API Key belum dikonfigurasi oleh Administrator. Silakan atur di Settings -> Void Tools -> API Configuration -> Downloader Providers.",
      };
    }

    // 2. Query configured API provider
    try {
      const targetApiUrl = `${base}${endpoint}?videoId=${videoId}&url=${encodeURIComponent(url)}`;
      const res = await fetch(targetApiUrl, {
        headers: {
          [config.authHeaderName || this.defaultAuthHeader]: key,
          "User-Agent": "VoidVerse-Downloader/2.0",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`YouTube API Error HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();

      // Parse common API responses (RapidAPI, Cobalt, or custom formats)
      const title = json.title || json.videoDetails?.title || oEmbedTitle;
      const author = json.author || json.videoDetails?.author || oEmbedAuthor;
      const thumbnail = json.thumbnail || json.videoDetails?.thumbnail || oEmbedThumbnail;

      const qualities: DownloaderResult["qualities"] = [];

      // Extract streams
      if (Array.isArray(json.videos || json.formats || json.streams)) {
        const streams = json.videos || json.formats || json.streams;
        for (const s of streams) {
          if (s.url || s.downloadUrl) {
            qualities.push({
              label: s.quality || s.label || s.resolution || "Direct MP4",
              url: s.url || s.downloadUrl,
              format: s.format || "mp4",
              sizeFormatted: s.size || s.fileSize,
            });
          }
        }
      }

      if (json.url || json.downloadUrl) {
        qualities.push({
          label: "HD Video (Direct MP4)",
          url: json.url || json.downloadUrl,
          format: "mp4",
        });
      }

      // Audio stream
      const audioUrl = json.audioUrl || json.audios?.[0]?.url;
      if (audioUrl) {
        qualities.push({
          label: "Audio Only (MP3)",
          url: audioUrl,
          format: "mp3",
        });
      }

      if (qualities.length === 0) {
        throw new Error("Tidak ada stream unduhan yang ditemukan dari respon API.");
      }

      return {
        success: true,
        platform: "YouTube",
        sourceUrl: url,
        title,
        author,
        thumbnail,
        duration: json.duration || json.lengthSeconds,
        qualities,
        audioUrl,
        fileName: `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.mp4`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
      return {
        success: false,
        platform: "YouTube",
        sourceUrl: url,
        title: oEmbedTitle,
        thumbnail: oEmbedThumbnail,
        qualities: [],
        error: `Gagal mengunduh video YouTube: ${msg}`,
      };
    }
  }
}

export const youTubeAdapter = new YouTubeAdapter();
