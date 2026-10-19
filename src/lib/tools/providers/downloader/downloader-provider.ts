import * as cheerio from "cheerio";
import { ApiProviderStatus } from "../../types";
import { isSafeDestination, safeSsrfFetch } from "@/lib/security/ssrf";

export interface MediaInspectResult {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  mediaType: "video" | "image" | "audio" | "archive" | "document" | "webpage" | "unknown";
  contentLengthBytes?: number;
  contentLengthFormatted?: string;
  fileName?: string;
  supportsResume: boolean;
  pageTitle?: string;
  mediaStreams?: { type: string; url: string }[];
}

export class DownloaderProvider {
  readonly id = "downloader";
  readonly name = "Media Stream & Downloader Inspector";
  readonly category = "downloader" as const;

  private formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return "Ukuran tidak diketahui";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(2)} ${units[i]}`;
  }

  async testConnection(): Promise<{ status: ApiProviderStatus; message: string }> {
    return {
      status: "connected",
      message: "Downloader Inspector Engine Aktif (HTTP Stream Header Probe siap).",
    };
  }

  async inspectUrl(targetUrl: string): Promise<MediaInspectResult> {
    if (!targetUrl.trim() || !/^https?:\/\//i.test(targetUrl)) {
      throw new Error("URL tidak valid. Harus diawali dengan http:// atau https://");
    }

    const destCheck = await isSafeDestination(targetUrl);
    if (!destCheck.safe) {
      throw new Error(`[SSRF Blocked] ${destCheck.reason}`);
    }

    // First attempt a HEAD request via safeSsrfFetch
    let res = await safeSsrfFetch(targetUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeoutMs: 8000,
    }).catch(() => null);

    // If HEAD fails or is rejected (method not allowed), fallback to GET with small range
    if (!res || !res.ok) {
      res = await safeSsrfFetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Range: "bytes=0-8192",
        },
        timeoutMs: 8000,
      });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const rawLen = res.headers.get("content-length");
    const contentLengthBytes = rawLen ? parseInt(rawLen, 10) : undefined;
    const acceptRanges = res.headers.get("accept-ranges");
    const supportsResume = acceptRanges === "bytes";

    // Extract filename from content-disposition or URL
    let fileName: string | undefined;
    const disposition = res.headers.get("content-disposition");
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^";]+)"?/i);
      if (match) fileName = match[1];
    }
    if (!fileName) {
      const pathname = new URL(res.url || targetUrl).pathname;
      const parts = pathname.split("/");
      const last = parts[parts.length - 1];
      if (last && last.includes(".")) fileName = decodeURIComponent(last);
    }

    // Determine media type
    let mediaType: MediaInspectResult["mediaType"] = "unknown";
    if (contentType.startsWith("video/")) mediaType = "video";
    else if (contentType.startsWith("image/")) mediaType = "image";
    else if (contentType.startsWith("audio/")) mediaType = "audio";
    else if (contentType.includes("zip") || contentType.includes("tar") || contentType.includes("rar")) mediaType = "archive";
    else if (contentType.includes("pdf") || contentType.includes("text/plain")) mediaType = "document";
    else if (contentType.includes("text/html")) mediaType = "webpage";

    let pageTitle: string | undefined;
    const mediaStreams: { type: string; url: string }[] = [];

    // If it's a webpage, parse for media links (OpenGraph / HTML5 video)
    if (mediaType === "webpage") {
      try {
        const htmlRes = await safeSsrfFetch(res.url || targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeoutMs: 8000,
          maxSizeBytes: 2 * 1024 * 1024,
        });
        const html = await htmlRes.text();
        const $ = cheerio.load(html);
        pageTitle = $("title").text().trim() || $('meta[property="og:title"]').attr("content");

        const ogVideo = $('meta[property="og:video"]').attr("content") || $('meta[property="og:video:url"]').attr("content");
        if (ogVideo) mediaStreams.push({ type: "video", url: ogVideo });

        const ogImage = $('meta[property="og:image"]').attr("content");
        if (ogImage) mediaStreams.push({ type: "image", url: ogImage });

        $("video source, video").each((_, el) => {
          const src = $(el).attr("src");
          if (src) mediaStreams.push({ type: "video", url: src });
        });
      } catch {
        // ignore HTML parsing errors
      }
    }

    return {
      url: targetUrl,
      finalUrl: res.url || targetUrl,
      status: res.status,
      contentType,
      mediaType,
      contentLengthBytes,
      contentLengthFormatted: this.formatBytes(contentLengthBytes),
      fileName,
      supportsResume,
      pageTitle,
      mediaStreams: mediaStreams.length > 0 ? mediaStreams : undefined,
    };
  }
}

export const downloaderProvider = new DownloaderProvider();
