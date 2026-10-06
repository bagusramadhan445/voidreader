import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
    }

    const decodedUrl = decodeURIComponent(imageUrl);

    // If already local placeholder
    if (decodedUrl.startsWith("/placeholder")) {
      return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
    }

    let referer = searchParams.get("referer") || "https://komiku.org/";

    try {
      const parsed = new URL(decodedUrl);
      const host = parsed.hostname.toLowerCase();

      // Specifically check for LINE Webtoon target hosts
      if (
        host === "webtoon-phinf.pstatic.net" ||
        host === "webtoons.com" ||
        host.endsWith(".webtoons.com") ||
        host.endsWith(".pstatic.net") ||
        host.includes("webtoon")
      ) {
        referer = "https://www.webtoons.com/";
      } else if (host.includes("komikcast") || host.includes("voratoon")) {
        referer = "https://komikcast.bz/";
      } else if (host.includes("shinigami")) {
        referer = "https://shinigami.moe/";
      }
    } catch {
      if (decodedUrl.includes("webtoon") || decodedUrl.includes("pstatic.net")) {
        referer = "https://www.webtoons.com/";
      }
    }

    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: referer,
      },
    });

    if (!response.ok) {
      console.warn(`[ImageProxy] Fetch failed (${response.status}) for: ${decodedUrl}`);
      return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: unknown) {
    console.warn("[ImageProxy] Error fetching image, falling back to placeholder:", error);
    return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
  }
}
