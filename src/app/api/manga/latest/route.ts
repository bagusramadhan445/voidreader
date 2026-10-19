import { sourceManager, parseChapterNumber } from "@/lib/sources";
import { NextRequest, NextResponse } from "next/server";
import { toSafeErrorMessage } from "@/lib/security/input-validator";


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("source") || "all";
    const limit = parseInt(searchParams.get("limit") || "200", 10);

    let items = [];
    if (sourceId === "all") {
      items = await sourceManager.getAllLatest(limit);
    } else {
      const source = sourceManager.getSource(sourceId);
      items = await source.getLatest(1);
    }

    // Sort descending by chapter number ("dari ch baru ke yang paling lama")
    const sorted = [...items].sort((a, b) => {
      const numA = parseChapterNumber(a.latestChapter);
      const numB = parseChapterNumber(b.latestChapter);
      if (numA !== null && numB !== null) {
        if (numA !== numB) return numB - numA;
      } else if (numA !== null && numB === null) {
        return -1;
      } else if (numA === null && numB !== null) {
        return 1;
      }
      if (a.updatedAt && b.updatedAt) {
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      return (a.title || "").localeCompare(b.title || "");
    });

    const result = sorted.slice(0, limit);

    return NextResponse.json({
      success: true,
      source: sourceId,
      total: result.length,
      data: result,
    });
  } catch (error: unknown) {
    console.error("[API /api/manga/latest] Error:", error);
    const message = toSafeErrorMessage(error, "Gagal memuat komik terbaru. Silakan coba beberapa saat lagi.");
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

