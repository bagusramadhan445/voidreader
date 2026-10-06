import { sourceManager } from "@/lib/sources";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || undefined;
    const genre = searchParams.get("genre") || undefined;
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || undefined;
    const sort = searchParams.get("sort") || undefined;
    let sourceId = searchParams.get("source") || undefined;
    if (sourceId === "lunar") {
      sourceId = "komiku";
    }

    const source = sourceManager.getSource(sourceId);

    let data: any[] = [];

    // If no query and user specifically asked for latest or popular:
    if (!query && !genre && (!type || type === "all") && (!status || status === "all")) {
      if (sort === "latest" && typeof source.getLatest === "function") {
        try {
          data = await source.getLatest();
        } catch (e) {
          console.warn(`[API /api/manga/search] getLatest failed for ${source.id}:`, e);
        }
      } else if ((sort === "popular" || !sort) && typeof source.getPopular === "function") {
        try {
          data = await source.getPopular();
        } catch (e) {
          console.warn(`[API /api/manga/search] getPopular failed for ${source.id}:`, e);
        }
      }
    }

    if (!data || data.length === 0) {
      data = await source.search({
        query,
        genre,
        type,
        status: status && status !== "all" ? status : undefined,
      });
    }

    // If browsing without text query and search returned empty, fallback to popular or home
    if ((!data || data.length === 0) && !query) {
      try {
        if (typeof source.getPopular === "function") {
          data = await source.getPopular();
        }
      } catch (e) {
        console.warn(`[API /api/manga/search] getPopular fallback error for ${source.id}:`, e);
      }

      if (!data || data.length === 0) {
        try {
          const home = await source.getHome();
          data = home.popular?.length ? home.popular : (home.latest?.length ? home.latest : []);
        } catch (e) {
          console.warn(`[API /api/manga/search] getHome fallback error for ${source.id}:`, e);
        }
      }
    }

    // Post-filter by status if specified and source didn't filter
    if (status && status !== "all" && Array.isArray(data)) {
      const lowerStatus = status.toLowerCase();
      data = data.filter((m) => {
        if (!m.status) return true;
        return m.status.toLowerCase().includes(lowerStatus);
      });
    }

    // Post-sort if requested
    if (Array.isArray(data)) {
      if (sort === "rating") {
        data = [...data].sort((a, b) => {
          const rA = parseFloat(a.rating || "0") || 0;
          const rB = parseFloat(b.rating || "0") || 0;
          return rB - rA;
        });
      } else if (sort === "latest") {
        // preserve or prioritize items with recent updatedAt or latest chapter
        data = [...data].sort((a, b) => {
          if (a.updatedAt && b.updatedAt) {
            return b.updatedAt.localeCompare(a.updatedAt);
          }
          return 0;
        });
      }
    }

    return NextResponse.json({
      success: true,
      source: source.id,
      total: (data || []).length,
      data: data || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[API /api/manga/search] Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
