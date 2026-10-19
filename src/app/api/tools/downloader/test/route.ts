import { NextRequest, NextResponse } from "next/server";
import { downloaderProviderManager } from "@/lib/tools/providers/downloader/downloader-provider-manager";
import { DownloaderPlatformId } from "@/lib/tools/providers/downloader/types";
import { requireAdmin } from "@/lib/security/auth-guard";
import { rateLimiter } from "@/lib/security/rate-limiter";

const VALID_PLATFORMS: DownloaderPlatformId[] = [
  "youtube",
  "tiktok",
  "instagram",
  "snackvideo",
  "terabox",
];

export async function POST(request: NextRequest) {
  try {
    const clientIp = rateLimiter.getClientIp(request);
    const limitCheck = rateLimiter.check(`dl_test_${clientIp}`, 15, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Batas permintaan pengujian provider tercapai. Silakan coba lagi nanti." },
        { status: 429 }
      );
    }

    const auth = await requireAdmin(request);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const body = await request.json().catch(() => ({}));
    const { providerId } = body;

    if (!providerId || !VALID_PLATFORMS.includes(providerId as DownloaderPlatformId)) {
      return NextResponse.json(
        { success: false, error: "Parameter providerId tidak valid atau tidak didukung." },
        { status: 400 }
      );
    }

    const result = await downloaderProviderManager.testProvider(providerId as DownloaderPlatformId);

    return NextResponse.json({
      success: true,
      providerId,
      status: result.status,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("[Downloader Test Error]:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat menguji provider." },
      { status: 500 }
    );
  }
}

