import { NextRequest, NextResponse } from "next/server";
import { sourceManager } from "@/lib/sources";
import {
  downloadImagesConcurrently,
  generateZipArchive,
  generateCbzArchive,
  generatePdfDocument,
} from "@/lib/tools/providers/downloader/archive-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Universal Archive Generator Endpoint (ZIP, CBZ, PDF)
 * Pipeline: Chapter Slug / Image URLs -> Image Fetching -> Archive Building -> File Streaming
 */
import { rateLimiter } from "@/lib/security/rate-limiter";
import { sanitizeTitle, toSafeErrorMessage } from "@/lib/security/input-validator";


export async function GET(request: NextRequest) {
  try {
    const clientIp = rateLimiter.getClientIp(request);
    const limitCheck = rateLimiter.check(`dl_archive_${clientIp}`, 20, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Batas permintaan pengunduhan tercapai. Silakan coba lagi sebentar lagi." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "zip").toLowerCase();
    const chapterSlug = searchParams.get("chapterSlug") || searchParams.get("chapter") || "";
    const sourceId = searchParams.get("source") || undefined;
    const titleParam = sanitizeTitle(searchParams.get("title") || "komik_chapter");
    const rawUrls = searchParams.get("urls") || "";

    let imageUrls: string[] = [];
    let archiveTitle = titleParam;

    // 1. Resolve image URLs either from chapterSlug or from provided URLs
    if (chapterSlug) {
      const source = sourceManager.getSourceForChapter(chapterSlug, sourceId);
      const chapterData = await source.getChapterPages(chapterSlug);

      if (!chapterData || !chapterData.pages || chapterData.pages.length === 0) {
        return NextResponse.json(
          { success: false, error: "Halaman chapter tidak ditemukan atau kosong." },
          { status: 404 }
        );
      }

      imageUrls = chapterData.pages.slice(0, 150);
      if (chapterData.title) {
        archiveTitle = sanitizeTitle(`${titleParam}_${chapterData.title}`);
      }
    } else if (rawUrls) {
      try {
        if (rawUrls.startsWith("[")) {
          imageUrls = JSON.parse(rawUrls);
        } else {
          imageUrls = rawUrls.split(",").map((u) => u.trim()).filter(Boolean);
        }
      } catch {
        imageUrls = rawUrls.split(",").map((u) => u.trim()).filter(Boolean);
      }
      imageUrls = imageUrls.slice(0, 120);
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "Parameter chapterSlug atau urls wajib disertakan." },
        { status: 400 }
      );
    }

    // 2. Fetch images concurrently with referer handling
    const downloadedImages = await downloadImagesConcurrently(imageUrls, 5);
    if (downloadedImages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Gagal mengunduh halaman gambar untuk membuat arsip." },
        { status: 502 }
      );
    }

    // 3. Generate requested archive format
    let result;
    if (type === "cbz") {
      result = await generateCbzArchive(downloadedImages, archiveTitle);
    } else if (type === "pdf") {
      result = await generatePdfDocument(downloadedImages, archiveTitle);
    } else {
      result = await generateZipArchive(downloadedImages, archiveTitle);
    }

    // 4. Return streaming response with attachment headers
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": result.sizeBytes.toString(),
        "Cache-Control": "public, max-age=7200, stale-while-revalidate=86400",
      },
    });
  } catch (error: unknown) {
    console.error("[Downloader Archive API Error]:", error);
    const message = toSafeErrorMessage(error, "Gagal membuat arsip unduhan.");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const clientIp = rateLimiter.getClientIp(request);
    const limitCheck = rateLimiter.check(`dl_archive_${clientIp}`, 20, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Batas permintaan pengunduhan tercapai. Silakan coba lagi sebentar lagi." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const type = (body.type || "zip").toLowerCase();
    const chapterSlug = body.chapterSlug || body.chapter || "";
    const sourceId = body.sourceId || body.source;
    const titleParam = sanitizeTitle(body.title || "komik_chapter");
    const urls = body.urls;

    let imageUrls: string[] = [];
    let archiveTitle = titleParam;

    if (chapterSlug) {
      const source = sourceManager.getSourceForChapter(chapterSlug, sourceId);
      const chapterData = await source.getChapterPages(chapterSlug);
      if (!chapterData || !chapterData.pages || chapterData.pages.length === 0) {
        return NextResponse.json(
          { success: false, error: "Halaman chapter tidak ditemukan." },
          { status: 404 }
        );
      }
      imageUrls = chapterData.pages.slice(0, 150);
      if (chapterData.title) archiveTitle = sanitizeTitle(`${titleParam}_${chapterData.title}`);
    } else if (Array.isArray(urls)) {
      imageUrls = urls.slice(0, 120);
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "Parameter chapterSlug atau urls wajib disertakan." },
        { status: 400 }
      );
    }

    const downloadedImages = await downloadImagesConcurrently(imageUrls, 5);
    if (downloadedImages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Gagal mengunduh gambar untuk membuat arsip." },
        { status: 502 }
      );
    }

    let result;
    if (type === "cbz") {
      result = await generateCbzArchive(downloadedImages, archiveTitle);
    } else if (type === "pdf") {
      result = await generatePdfDocument(downloadedImages, archiveTitle);
    } else {
      result = await generateZipArchive(downloadedImages, archiveTitle);
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": result.sizeBytes.toString(),
      },
    });
  } catch (error: unknown) {
    console.error("[Downloader Archive API Error]:", error);
    const message = toSafeErrorMessage(error, "Gagal membuat arsip unduhan.");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

