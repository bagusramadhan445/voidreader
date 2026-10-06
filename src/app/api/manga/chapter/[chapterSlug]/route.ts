import { sourceManager } from "@/lib/sources";
import { NextRequest, NextResponse } from "next/server";

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
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[API /api/manga/chapter/[chapterSlug]] Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
