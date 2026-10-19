import * as cheerio from "cheerio";
import { DownloaderResult, DownloaderStreamQuality } from "./types";

export class ImageDownloaderProvider {
  readonly id = "image_downloader";
  readonly name = "Universal Image & Batch Downloader";

  async resolve(input: string): Promise<DownloaderResult> {
    const trimmed = input.trim();
    if (!trimmed) {
      return {
        success: false,
        platform: "Image Downloader",
        sourceUrl: input,
        title: "",
        qualities: [],
        error: "URL gambar atau halaman web tidak boleh kosong.",
      };
    }

    // 1. Check if multiple URLs are provided (newline or comma separated)
    const rawLines = trimmed.split(/[\n,\s]+/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));

    if (rawLines.length > 1) {
      return this.resolveMultipleImages(rawLines);
    }

    const singleUrl = rawLines[0] || trimmed;

    // 2. Check if the single URL is a direct image file
    const isDirectImage = /\.(jpe?g|png|gif|webp|svg|bmp|tiff)(\?.*)?$/i.test(singleUrl);

    if (isDirectImage) {
      return await this.resolveSingleDirectImage(singleUrl);
    }

    // 3. Otherwise treat as a webpage to scrape all images from
    return await this.resolveWebpageImages(singleUrl);
  }

  private async resolveSingleDirectImage(imageUrl: string): Promise<DownloaderResult> {
    try {
      const res = await fetch(imageUrl, {
        method: "HEAD",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      const contentType = res?.headers?.get("content-type") || "image/jpeg";
      const contentLength = res?.headers?.get("content-length");
      const sizeBytes = contentLength ? parseInt(contentLength, 10) : undefined;
      const sizeFormatted = sizeBytes ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB` : undefined;

      const ext = imageUrl.split("?")[0].split(".").pop() || "jpg";
      const fileName = `image_${Date.now()}.${ext}`;

      return {
        success: true,
        platform: "Image Downloader (Direct)",
        title: fileName,
        thumbnail: imageUrl,
        sourceUrl: imageUrl,
        fileName,
        qualities: [
          {
            label: `Unduh Gambar Penuh (${contentType.split("/")[1]?.toUpperCase() || ext.toUpperCase()})`,
            url: imageUrl,
            format: ext,
            sizeFormatted: sizeFormatted || "Ukuran Asli",
          },
        ],

      };
    } catch {
      return {
        success: true,
        platform: "Image Downloader (Direct)",
        title: "Gambar Asli",
        thumbnail: imageUrl,
        sourceUrl: imageUrl,
        fileName: "image.jpg",
        qualities: [
          {
            label: "Unduh Gambar Langsung",
            url: imageUrl,
            format: "jpg",
          },
        ],
      };
    }
  }

  private resolveMultipleImages(urls: string[]): DownloaderResult {
    const validUrls = Array.from(new Set(urls)).slice(0, 50);
    const title = `Batch Unduhan (${validUrls.length} Gambar)`;

    const zipUrl = `/api/tools/downloader/archive?type=zip&urls=${encodeURIComponent(
      JSON.stringify(validUrls)
    )}&title=batch_images`;

    const qualities: DownloaderStreamQuality[] = [
      {
        label: `Unduh Semua Gambar Sekaligus (.zip)`,
        url: zipUrl,
        format: "zip",
        sizeFormatted: `~${(validUrls.length * 0.5).toFixed(1)} MB`,
      },
    ];

    validUrls.slice(0, 10).forEach((u, i) => {
      const ext = u.split("?")[0].split(".").pop() || "jpg";
      qualities.push({
        label: `Gambar ${i + 1} (${ext.toUpperCase()})`,
        url: u,
        format: ext,
      });
    });

    return {
      success: true,
      platform: "Batch Image Downloader",
      title,
      thumbnail: validUrls[0],
      duration: `${validUrls.length} Gambar`,
      sourceUrl: validUrls[0],
      fileName: `batch_images_${Date.now()}.zip`,
      qualities,
      metadata: {
        totalImages: validUrls.length,
        allUrls: validUrls,
      },
    };
  }

  private async resolveWebpageImages(pageUrl: string): Promise<DownloaderResult> {
    try {
      const res = await fetch(pageUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        throw new Error(`Gagal membuka halaman web: HTTP ${res.status}`);
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      const pageTitle = $("title").text().trim() || "Webpage Images";

      const extractedUrls = new Set<string>();

      // OpenGraph Image
      const ogImg = $('meta[property="og:image"]').attr("content");
      if (ogImg && /^https?:\/\//i.test(ogImg)) extractedUrls.add(ogImg);

      // Twitter Image
      const twImg = $('meta[name="twitter:image"]').attr("content");
      if (twImg && /^https?:\/\//i.test(twImg)) extractedUrls.add(twImg);

      // All <img> src attributes
      $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
        if (src) {
          try {
            const absolute = new URL(src, pageUrl).href;
            if (/^https?:\/\//i.test(absolute) && !absolute.includes("data:image")) {
              extractedUrls.add(absolute);
            }
          } catch {
            // ignore
          }
        }
      });

      const list = Array.from(extractedUrls).slice(0, 40);
      if (list.length === 0) {
        throw new Error("Tidak ada gambar yang ditemukan dalam halaman web ini.");
      }

      const zipUrl = `/api/tools/downloader/archive?type=zip&urls=${encodeURIComponent(
        JSON.stringify(list)
      )}&title=${encodeURIComponent(pageTitle.slice(0, 30))}`;

      const qualities: DownloaderStreamQuality[] = [
        {
          label: `Unduh Semua Gambar Halaman (.zip) [${list.length} Gambar]`,
          url: zipUrl,
          format: "zip",
          sizeFormatted: `~${(list.length * 0.4).toFixed(1)} MB`,
        },
      ];

      list.slice(0, 10).forEach((u, i) => {
        const ext = u.split("?")[0].split(".").pop() || "jpg";
        qualities.push({
          label: `Gambar ${i + 1} (${ext.toUpperCase()})`,
          url: u,
          format: ext,
        });
      });

      return {
        success: true,
        platform: "Webpage Image Extractor",
        title: `${pageTitle} (${list.length} Gambar)`,
        thumbnail: list[0],
        duration: `${list.length} Gambar`,
        sourceUrl: pageUrl,
        fileName: `${pageTitle.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_")}_images.zip`,
        qualities,
        metadata: {
          totalImages: list.length,
          allUrls: list,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengekstrak gambar";
      return {
        success: false,
        platform: "Image Downloader",
        sourceUrl: pageUrl,
        title: pageUrl,
        qualities: [],
        error: `Gagal mengekstrak gambar dari halaman web: ${msg}`,
      };
    }
  }
}

export const imageDownloaderProvider = new ImageDownloaderProvider();
