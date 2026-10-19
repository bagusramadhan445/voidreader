import { NextRequest, NextResponse } from "next/server";
import { downloaderProviderManager } from "@/lib/tools/providers/downloader/downloader-provider-manager";
import { DownloaderPlatformId } from "@/lib/tools/providers/downloader/types";
import { requireAdmin } from "@/lib/security/auth-guard";
import { rateLimiter } from "@/lib/security/rate-limiter";
import { isSafeDestination } from "@/lib/security/ssrf";

export async function GET() {
  try {
    const configs = downloaderProviderManager.getClientConfigs();
    return NextResponse.json({
      success: true,
      providers: configs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = rateLimiter.getClientIp(request);
    const limit = rateLimiter.check(`downloader_config_${clientIp}`, 15, 60000);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak permintaan konfigurasi downloader." },
        { status: 429 }
      );
    }

    const auth = await requireAdmin(request);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const body = await request.json().catch(() => ({}));
    const { id, enabled, apiKey, baseUrl, endpoint, authHeaderName } = body;

    const validIds: DownloaderPlatformId[] = ["youtube", "tiktok", "instagram", "snackvideo", "terabox"];
    if (!id || !validIds.includes(id as DownloaderPlatformId)) {
      return NextResponse.json(
        { success: false, error: "Parameter id provider tidak valid." },
        { status: 400 }
      );
    }

    if (baseUrl && typeof baseUrl === "string" && baseUrl.trim()) {
      try {
        const parsed = new URL(baseUrl.trim());
        const destCheck = await isSafeDestination(parsed);
        if (!destCheck.safe) {
          return NextResponse.json(
            { success: false, error: `Base URL tidak aman: ${destCheck.reason}` },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: "Format Base URL tidak valid." },
          { status: 400 }
        );
      }
    }

    const updated = downloaderProviderManager.saveConfig(id as DownloaderPlatformId, {
      enabled: enabled !== undefined ? Boolean(enabled) : undefined,
      apiKey: typeof apiKey === "string" ? apiKey : undefined,
      baseUrl: typeof baseUrl === "string" ? baseUrl.trim() : undefined,
      endpoint: typeof endpoint === "string" ? endpoint.trim() : undefined,
      authHeaderName: typeof authHeaderName === "string" ? authHeaderName.trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      provider: updated,
      message: `Konfigurasi ${updated.name} berhasil disimpan di server.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan konfigurasi";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
