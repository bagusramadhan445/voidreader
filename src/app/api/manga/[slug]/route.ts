import { sourceManager } from "@/lib/sources";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const params = await context.params;
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("source") || undefined;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Slug is required" },
        { status: 400 }
      );
    }

    const source = sourceManager.getSourceForManga(slug, sourceId);
    const data = await source.getDetail(slug);

    return NextResponse.json({
      success: true,
      source: source.id,
      data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[API /api/manga/[slug]] Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
