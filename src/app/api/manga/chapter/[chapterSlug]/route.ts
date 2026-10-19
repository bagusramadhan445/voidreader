import { sourceManager } from "@/lib/sources";
import { NextRequest, NextResponse } from "next/server";
import { toSafeErrorMessage } from "@/lib/security/input-validator";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ chapterSlug: string }> | { chapterSlug: string } }
) {
  try {
    const params = await context.params;
    const { chapterSlug } = params;
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("source") || undefined;

    if (!chapterSlug) {
      return NextResponse.json(
        { success: false, error: "Chapter slug is required" },
        { status: 400 }
      );
    }

    const source = sourceManager.getSourceForChapter(chapterSlug, sourceId);
    const data = await source.getChapterPages(chapterSlug);

    return NextResponse.json({
      success: true,
      source: source.id,
      data,
    });
  } catch (error: unknown) {
    console.error("[API /api/manga/chapter/[chapterSlug]] Error:", error);
    const message = toSafeErrorMessage(error, "Gagal memuat halaman chapter. Silakan coba beberapa saat lagi.");
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

