import { NextRequest, NextResponse } from "next/server";
import { toolsConfigStore } from "@/lib/tools/tools-config-store";
import { requireAdmin } from "@/lib/security/auth-guard";
import { rateLimiter } from "@/lib/security/rate-limiter";
import { isSafeDestination } from "@/lib/security/ssrf";

export async function GET() {
  try {
    const providers = toolsConfigStore.getPublicProvidersConfig();
    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = rateLimiter.getClientIp(request);
    const limit = rateLimiter.check(`tools_config_post_${clientIp}`, 15, 60000);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak permintaan konfigurasi. Silakan tunggu sebentar." },
        { status: 429 }
      );
    }

    const auth = await requireAdmin(request);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const body = await request.json().catch(() => ({}));
    const { providerId, apiKey, baseUrl, model, enabled } = body;

    if (!providerId || typeof providerId !== "string" || !/^[a-zA-Z0-9_-]{2,50}$/.test(providerId)) {
      return NextResponse.json(
        { success: false, error: "Parameter providerId tidak valid." },
        { status: 400 }
      );
    }

    if (baseUrl && typeof baseUrl === "string" && baseUrl.trim()) {
      try {
        const parsed = new URL(baseUrl.trim());
        const destCheck = await isSafeDestination(parsed);
        if (!destCheck.safe) {
          return NextResponse.json(
            { success: false, error: `Base URL tidak diizinkan: ${destCheck.reason}` },
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

    const updated = toolsConfigStore.saveApiKey(
      providerId,
      typeof apiKey === "string" ? apiKey : "",
      typeof baseUrl === "string" ? baseUrl : undefined,
      typeof model === "string" ? model : undefined,
      typeof enabled === "boolean" ? enabled : undefined
    );

    const safeProvider = {
      providerId: updated.providerId,
      providerName: updated.providerName,
      isConfigured: Boolean(updated.apiKey?.trim()),
      baseUrl: updated.baseUrl,
      model: updated.model,
      enabled: updated.enabled,
      status: updated.status,
      lastTested: updated.lastTested,
    };

    return NextResponse.json({
      success: true,
      provider: safeProvider,
      message: `Konfigurasi ${providerId.toUpperCase()} berhasil disimpan di server.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan konfigurasi";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
