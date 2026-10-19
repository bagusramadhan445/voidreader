import { NextRequest, NextResponse } from "next/server";
import { isSafeDestination, safeSsrfFetch } from "@/lib/security/ssrf";
import { rateLimiter } from "@/lib/security/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Rate Limiting (300 req/min per IP to accommodate catalog grid browsing)
    const clientIp = rateLimiter.getClientIp(request);
    const limitCheck = rateLimiter.check(`image_proxy_${clientIp}`, 300, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
    }

    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
    }

    let decodedUrl = decodeURIComponent(imageUrl).trim();

    // If already local placeholder
    if (decodedUrl.startsWith("/placeholder")) {
      return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
    }

    // Rewrite dead Komiku domains to active CDN
    decodedUrl = decodedUrl
      .replace(/^https?:\/\/thumbnail\.komiku\.(?:to|id)/i, "https://thumbnail.komiku.org")
      .replace(/^https?:\/\/img\.komiku\.id/i, "https://thumbnail.komiku.org")
      .replace(/^https?:\/\/komiku\.(?:to|id)/i, "https://komiku.org");

    let parsed: URL;
    try {
      parsed = new URL(decodedUrl);
    } catch {
      return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
    }

    // 2. Strict SSRF Pre-flight Validation
    const destCheck = await isSafeDestination(parsed);
    if (!destCheck.safe) {
      console.warn(`[ImageProxy SSRF Blocked] Host ${parsed.hostname}: ${destCheck.reason}`);
      return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
    }

    const host = parsed.hostname.toLowerCase();
    let referer = searchParams.get("referer") || "https://komiku.org/";

    // Specifically check for provider target hosts
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
    } else if (host.includes("shinigami") || host.includes("shngm")) {
      referer = "https://shinigami.moe/";
    } else if (host.includes("mangadex")) {
      referer = "https://mangadex.org/";
    } else if (host.includes("komiku")) {
      referer = "https://komiku.org/";
    }

    // 3. SSRF-safe fetch with redirect validation, 8s timeout, and 10MB limit
    const response = await safeSsrfFetch(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 VoidVerse/2.0",
        Referer: referer,
      },
      timeoutMs: 8000,
      maxSizeBytes: 10 * 1024 * 1024,
      allowedContentTypes: ["image/", "application/octet-stream", "binary/octet-stream"],
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
    }

    let contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.toLowerCase().startsWith("image/")) {
      contentType = "image/jpeg";
    }
    const imageBuffer = await response.arrayBuffer();

    // 4. Return image with secure cache headers and restricted CORS
    const origin = request.headers.get("origin");
    const isAllowed = isAllowedCorsOrigin(origin);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Content-Type-Options": "nosniff",
        ...(isAllowed && origin
          ? {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Range",
            }
          : {}),
        Vary: "Origin",
      },
    });
  } catch (error: unknown) {
    console.warn("[ImageProxy] Error fetching image, falling back to placeholder:", error instanceof Error ? error.message : error);
    return NextResponse.redirect(new URL("/placeholder.jpg", request.url));
  }
}

/**
 * Validates CORS origins with strict hostname boundary matching.
 * Disallows substring trickery (e.g., evil-voidverse.my.id.attacker.com).
 */
export function isAllowedCorsOrigin(originHeader: string | null): boolean {
  if (!originHeader || typeof originHeader !== "string") return false;
  try {
    const parsed = new URL(originHeader.trim());
    const hostname = parsed.hostname.toLowerCase();

    // Local development hosts
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return true;
    }

    // Official production & preview domains
    if (
      hostname === "voidverse.my.id" ||
      hostname.endsWith(".voidverse.my.id") ||
      hostname === "voidreader-phi.vercel.app"
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowed = isAllowedCorsOrigin(origin);

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
      "Access-Control-Max-Age": "86400",
      ...(isAllowed && origin ? { "Access-Control-Allow-Origin": origin } : {}),
      Vary: "Origin",
    },
  });
}

