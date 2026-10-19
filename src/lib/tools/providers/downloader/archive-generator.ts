import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

export interface ArchivePageImage {
  url: string;
  index: number;
}

export interface ArchiveGenerationResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

import { isSafeDestination, safeSsrfFetch } from "@/lib/security/ssrf";

/**
 * Downloads an image safely with proper referer, User-Agent, and SSRF protection
 */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const destCheck = await isSafeDestination(url);
    if (!destCheck.safe) {
      console.warn(`[Archive SSRF Blocked] ${destCheck.reason}`);
      return null;
    }

    let referer = "https://komiku.org/";
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host.includes("webtoon") || host.includes("pstatic.net")) {
        referer = "https://www.webtoons.com/";
      } else if (host.includes("komikcast") || host.includes("voratoon")) {
        referer = "https://komikcast.bz/";
      } else if (host.includes("shinigami")) {
        referer = "https://shinigami.moe/";
      }
    } catch {
      // ignore URL parsing error
    }

    const res = await safeSsrfFetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 VoidVerse/2.0",
        Referer: referer,
      },
      timeoutMs: 12000,
      maxSizeBytes: 15 * 1024 * 1024,
      allowedContentTypes: ["image/"],
    });

    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err: unknown) {
    console.warn("[Archive] Error fetching image buffer:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Downloads multiple image URLs concurrently in batches
 */
export async function downloadImagesConcurrently(
  urls: string[],
  concurrency = 5
): Promise<{ buffer: Buffer; index: number; ext: string }[]> {
  const results: { buffer: Buffer; index: number; ext: string }[] = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (url, idx) => {
        const globalIdx = i + idx;
        const buf = await fetchImageBuffer(url);
        if (!buf) return null;

        // Detect extension from buffer or URL
        let ext = "jpg";
        if (url.endsWith(".png")) ext = "png";
        else if (url.endsWith(".webp")) ext = "webp";

        return { buffer: buf, index: globalIdx + 1, ext };
      })
    );

    for (const item of chunkResults) {
      if (item) results.push(item);
    }
  }

  // Sort by index
  results.sort((a, b) => a.index - b.index);
  return results;
}

/**
 * Generates a ZIP archive containing all images
 */
export async function generateZipArchive(
  images: { buffer: Buffer; index: number; ext: string }[],
  title: string
): Promise<ArchiveGenerationResult> {
  const zip = new JSZip();

  for (const img of images) {
    const pageNum = String(img.index).padStart(3, "0");
    zip.file(`page_${pageNum}.${img.ext}`, img.buffer);
  }

  const safeTitle = title.slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeTitle}.zip`;
  const nodeBuf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 5 },
  });

  return {
    buffer: nodeBuf,
    fileName,
    mimeType: "application/zip",
    sizeBytes: nodeBuf.length,
  };
}

/**
 * Generates a Comic Book Zip (.cbz) archive containing all images
 */
export async function generateCbzArchive(
  images: { buffer: Buffer; index: number; ext: string }[],
  title: string
): Promise<ArchiveGenerationResult> {
  const zip = new JSZip();

  // Add ComicInfo.xml metadata for comic readers
  const comicInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Title>${title.replace(/[<>&]/g, "")}</Title>
  <PageCount>${images.length}</PageCount>
  <Manga>YesAndRightToLeft</Manga>
</ComicInfo>`;
  zip.file("ComicInfo.xml", comicInfoXml);

  for (const img of images) {
    const pageNum = String(img.index).padStart(3, "0");
    zip.file(`page_${pageNum}.${img.ext}`, img.buffer);
  }

  const safeTitle = title.slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeTitle}.cbz`;
  const nodeBuf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 5 },
  });

  return {
    buffer: nodeBuf,
    fileName,
    mimeType: "application/x-cbz",
    sizeBytes: nodeBuf.length,
  };
}

/**
 * Generates a PDF reader document containing all chapter images
 */
export async function generatePdfDocument(
  images: { buffer: Buffer; index: number; ext: string }[],
  title: string
): Promise<ArchiveGenerationResult> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(title);
  pdfDoc.setAuthor("VoidVerse Reader");

  for (const img of images) {
    try {
      let embeddedImage;
      if (img.ext === "png") {
        embeddedImage = await pdfDoc.embedPng(img.buffer).catch(async () => {
          return await pdfDoc.embedJpg(img.buffer);
        });
      } else {
        embeddedImage = await pdfDoc.embedJpg(img.buffer).catch(async () => {
          return await pdfDoc.embedPng(img.buffer);
        });
      }

      if (embeddedImage) {
        const { width, height } = embeddedImage;
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }
    } catch {
      // If single page embedding fails, continue with next pages
    }
  }

  // Fallback if no pages could be added
  if (pdfDoc.getPageCount() === 0) {
    const fallbackPage = pdfDoc.addPage([595, 842]);
    fallbackPage.drawText(`Komik: ${title}\n(Gagal memuat gambar)`, { x: 50, y: 700 });
  }

  const pdfBytes = await pdfDoc.save();
  const safeTitle = title.slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeTitle}.pdf`;
  const buffer = Buffer.from(pdfBytes);

  return {
    buffer,
    fileName,
    mimeType: "application/pdf",
    sizeBytes: buffer.length,
  };
}
