import { NextRequest, NextResponse } from "next/server";
import { downloaderProviderManager } from "@/lib/tools/providers/downloader/downloader-provider-manager";
import { isSafeDestination } from "@/lib/security/ssrf";
import { rateLimiter } from "@/lib/security/rate-limiter";
import { isValidUrl } from "@/lib/security/input-validator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting (30 req/min per IP)
    const clientIp = rateLimiter.getClientIp(request);
    const limitCheck = rateLimiter.check(`dl_execute_${clientIp}`, 30, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Batas permintaan pengunduhan tercapai. Silakan coba lagi beberapa saat lagi." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { url } = body;

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { success: false, error: "Parameter url wajib disertakan dan harus berupa URL HTTP/HTTPS yang valid." },
        { status: 400 }
      );
    }

    // 2. Strict Pre-flight SSRF Validation
    const destCheck = await isSafeDestination(url);
    if (!destCheck.safe) {
      return NextResponse.json(
        {
          success: false,
          error: "Tautan tujuan tidak diizinkan karena mengarah ke alamat internal atau jaringan privat.",
        },
        { status: 400 }
      );
    }

    // 3. Resolve download via provider manager
    const result = await downloaderProviderManager.resolveDownload(url);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Gagal mengunduh media dari tautan ini.",
          platform: result.platform,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("[Downloader Execute API Error]:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal saat memproses tautan unduhan." },
      { status: 500 }
    );
  }
}
