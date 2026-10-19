import { NextRequest, NextResponse } from "next/server";
import { providerManager } from "@/lib/tools/providers/provider-manager";
import { rateLimiter } from "@/lib/security/rate-limiter";
import { validateProviderBaseUrl } from "@/lib/security/provider-allowlist";
import { isSafeDestination } from "@/lib/security/ssrf";

export async function POST(request: NextRequest) {
  try {
    const clientIp = rateLimiter.getClientIp(request);
    const limit = rateLimiter.check(`provider_status_${clientIp}`, 40, 60000);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak permintaan evaluasi status provider." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { userKeys, testProviderId, apiKey, baseUrl } = body;

    // If request asks to test a single provider specifically
    if (testProviderId) {
      if (typeof testProviderId !== "string" || !/^[a-zA-Z0-9_-]{2,50}$/.test(testProviderId)) {
        return NextResponse.json(
          { success: false, error: "ID provider tidak valid." },
          { status: 400 }
        );
      }

      if (baseUrl && typeof baseUrl === "string" && baseUrl.trim()) {
        const val = validateProviderBaseUrl(testProviderId, baseUrl);
        if (!val.valid) {
          return NextResponse.json(
            { success: false, error: val.error || "Base URL tidak valid." },
            { status: 400 }
          );
        }

        // Custom endpoints MUST NOT receive server keys
        if (!val.isOfficial) {
          if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "Custom Base URL requires providing your own API key. Server credentials cannot be sent to custom endpoints.",
              },
              { status: 400 }
            );
          }

          try {
            const destCheck = await isSafeDestination(new URL(baseUrl.trim()));
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
      }

      const testResult = await providerManager.testSingleProvider(
        testProviderId,
        typeof apiKey === "string" ? apiKey : undefined,
        typeof baseUrl === "string" ? baseUrl : undefined
      );

      return NextResponse.json({
        success: true,
        providerId: testProviderId,
        ...testResult,
      });
    }

    // Otherwise, return comprehensive status report for all providers
    const sanitizedKeys =
      userKeys && typeof userKeys === "object"
        ? (userKeys as Record<string, string>)
        : {};

    const statuses = await providerManager.getAllProvidersStatus(sanitizedKeys);

    return NextResponse.json({
      success: true,
      providers: statuses,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengevaluasi status provider";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = rateLimiter.getClientIp(request);
    const limit = rateLimiter.check(`provider_status_get_${clientIp}`, 30, 60000);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak permintaan evaluasi status provider." },
        { status: 429 }
      );
    }

    // Unauthenticated / server-env only status check
    const statuses = await providerManager.getAllProvidersStatus();
    return NextResponse.json({
      success: true,
      providers: statuses,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
