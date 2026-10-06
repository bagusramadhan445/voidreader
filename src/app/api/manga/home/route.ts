import { sourceManager } from "@/lib/sources";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let sourceId =
      searchParams.get("source") ||
      request.cookies.get("void_reader_default_source")?.value ||
      undefined;

    if (sourceId === "lunar") {
      sourceId = "komiku";
    }

    let source = sourceManager.getSource(sourceId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = null;

    try {
      data = await source.getHome();
    } catch (sourceErr) {
      console.warn(`[API /api/manga/home] Error fetching from ${source.id}:`, sourceErr);
      data = null;
    }

    // Check if data is empty or corrupted, fallback to komiku if active source wasn't komiku
    const isEmpty =
      !data ||
      ((!data.popular || data.popular.length === 0) &&
        (!data.latest || data.latest.length === 0) &&
        (!data.featured || data.featured.length === 0));

    if (isEmpty && source.id !== "komiku") {
      console.warn(
        `[API /api/manga/home] Source ${source.id} returned empty or failed data. Falling back to Komiku Indonesia.`
      );
      source = sourceManager.getSource("komiku");
      data = await source.getHome();
    }

    if (!data) {
      throw new Error("Gagal memuat data beranda dari sumber manga.");
    }

    // Ensure all items have sourceId set
    const allCategories = ["featured", "popular", "latest", "recommendations"] as const;
    allCategories.forEach((cat) => {
      if (Array.isArray(data[cat])) {
        data[cat] = data[cat].map((item: any) => ({
          ...item,
          sourceId: item.sourceId || source.id,
        }));
      }
    });

    // Debug API response: Log manga objects
    console.log(`=== [API /api/manga/home] Loaded from source: ${source.id} ===`);
    const allItems = [
      ...(data.featured || []),
      ...(data.popular || []),
      ...(data.latest || []),
      ...(data.recommendations || []),
    ];
    if (allItems.length > 0) {
      console.log(
        JSON.stringify({
          source: source.id,
          sampleTitle: allItems[0].title,
          sampleCover: allItems[0].cover,
          totalItems: allItems.length,
        })
      );
    }

    return NextResponse.json({
      success: true,
      source: source.id,
      data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[API /api/manga/home] Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
