import {
  DownloaderAdapter,
  DownloaderPlatformId,
  DownloaderProviderConfig,
  DownloaderProviderStatus,
  DownloaderResult,
} from "./types";

export class TikTokAdapter implements DownloaderAdapter {
  readonly id: DownloaderPlatformId = "tiktok";
  readonly name = "TikTok Downloader API";
  readonly platformName = "TikTok Video & Music";
  readonly defaultBaseUrl = "https://www.tikwm.com";
  readonly defaultEndpoint = "/api/";
  readonly defaultAuthHeader = "X-RapidAPI-Key";

  matchesUrl(url: string): boolean {
    return /(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i.test(url);
  }

  async testConnection(
    config: DownloaderProviderConfig
  ): Promise<{ status: DownloaderProviderStatus; message: string }> {
    if (!config.enabled) {
      return { status: "disabled", message: "Provider TikTok Downloader dinonaktifkan." };
    }

    const base = config.baseUrl || this.defaultBaseUrl;

    try {
      const headers: Record<string, string> = {
        "User-Agent": "VoidVerse-Downloader/2.0",
      };
      if (config.apiKey) {
        headers[config.authHeaderName || this.defaultAuthHeader] = config.apiKey;
      }

      const res = await fetch(`${base}`, {
        method: "HEAD",
        headers,
        signal: AbortSignal.timeout(8000),
      }).catch(async () => {
        return await fetch(`${base}`, { headers, signal: AbortSignal.timeout(8000) });
      });

      if (res.status === 200 || res.status === 301 || res.status === 302) {
        return { status: "connected", message: "Terhubung ke TikTok Downloader API (Aktif)." };
      }
      if (res.status === 429) {
        return { status: "rate_limited", message: "Rate limit TikTok API tercapai (HTTP 429)." };
      }
      if (res.status === 401 || res.status === 403) {
        return { status: "error", message: `Akses ditolak (HTTP ${res.status}). Periksa API Key.` };
      }

      return { status: "connected", message: `Status HTTP ${res.status} OK.` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal terhubung";
      return { status: "error", message: `Koneksi gagal: ${msg}` };
    }
  }

  async resolve(url: string, config: DownloaderProviderConfig): Promise<DownloaderResult> {
    const base = config.baseUrl || this.defaultBaseUrl;
    const endpoint = config.endpoint || this.defaultEndpoint;

    try {
      const headers: Record<string, string> = {
        "User-Agent": "VoidVerse-Downloader/2.0",
        Accept: "application/json",
      };
      if (config.apiKey) {
        headers[config.authHeaderName || this.defaultAuthHeader] = config.apiKey;
      }

      // 1. Support default TikWM API endpoint format
      const targetUrl = `${base}${endpoint}?url=${encodeURIComponent(url)}&count=12&cursor=0&web=1&hd=1`;

      const res = await fetch(targetUrl, {
        headers,
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`TikTok API Error HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const data = json.data || json;

      if (!data) {
        throw new Error("Respon TikTok API tidak berisi data video.");
      }

      const title = data.title || data.desc || "TikTok Video";
      const author = data.author?.nickname || data.author?.unique_id || data.author_name || "";
      const thumbnail = data.cover || data.origin_cover || data.thumbnail;

      // Extract original video streams
      const hdVideoUrl = data.hdplay
        ? (data.hdplay.startsWith("http") ? data.hdplay : `https://www.tikwm.com${data.hdplay}`)
        : null;
      const standardVideoUrl = data.play
        ? (data.play.startsWith("http") ? data.play : `https://www.tikwm.com${data.play}`)
        : null;
      const wmVideoUrl = data.wmplay
        ? (data.wmplay.startsWith("http") ? data.wmplay : `https://www.tikwm.com${data.wmplay}`)
        : null;

      // Primary video stream for audio extraction (prefer standard clean stream or HD clean stream)
      const primaryVideoStream = standardVideoUrl || hdVideoUrl || wmVideoUrl;

      const qualities: DownloaderResult["qualities"] = [];

      // 1. HD No Watermark stream
      if (hdVideoUrl) {
        qualities.push({
          label: "HD Tanpa Watermark (1080p MP4)",
          url: hdVideoUrl,
          format: "mp4",
        });
      }

      // 2. Standard No Watermark stream
      if (standardVideoUrl) {
        qualities.push({
          label: "Tanpa Watermark (MP4)",
          url: standardVideoUrl,
          format: "mp4",
        });
      }

      // 3. Watermarked stream
      if (wmVideoUrl) {
        qualities.push({
          label: "Dengan Watermark (MP4)",
          url: wmVideoUrl,
          format: "mp4",
        });
      }

      // 4. Original Audio Extraction directly from Video Stream
      // NOTE: Do NOT use data.music or music_info metadata because it often returns wrong catalog music
      // instead of the creator's real voice, mixed audio, or original video track.
      let generatedAudioUrl: string | undefined;
      if (primaryVideoStream) {
        generatedAudioUrl = `/api/tools/downloader/audio?sourceUrl=${encodeURIComponent(
          primaryVideoStream
        )}&title=${encodeURIComponent(title)}&platform=tiktok`;

        qualities.push({
          label: "Original Audio (MP3 - dari Video)",
          url: generatedAudioUrl,
          format: "mp3",
        });
      }

      if (qualities.length === 0) {
        throw new Error("Gagal mengekstrak tautan stream video TikTok.");
      }

      return {
        success: true,
        platform: "TikTok",
        sourceUrl: url,
        title,
        author,
        thumbnail,
        duration: data.duration,
        qualities,
        audioUrl: generatedAudioUrl,
        fileName: `${title.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_")}_tiktok.mp4`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      return {
        success: false,
        platform: "TikTok",
        sourceUrl: url,
        title: "TikTok Video",
        qualities: [],
        error: `Gagal memproses video TikTok: ${msg}`,
      };
    }
  }
}

export const tikTokAdapter = new TikTokAdapter();
