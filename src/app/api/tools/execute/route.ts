import { NextRequest, NextResponse } from "next/server";
import { toolRegistry } from "@/lib/tools/registry";
import { providerManager } from "@/lib/tools/providers/provider-manager";
import { rateLimiter } from "@/lib/security/rate-limiter";
import { requireAuth } from "@/lib/security/auth-guard";

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting (30 req/min per client IP)
    const clientIp = rateLimiter.getClientIp(request);
    const limitCheck = rateLimiter.check(`tool_exec_${clientIp}`, 30, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak permintaan eksekusi tools. Silakan tunggu sebentar." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { toolId, params, apiKeys } = body;

    if (!toolId || typeof toolId !== "string" || !/^[a-zA-Z0-9_-]{2,60}$/.test(toolId)) {
      return NextResponse.json(
        { success: false, error: "Parameter toolId tidak valid." },
        { status: 400 }
      );
    }

    const tool = toolRegistry.getToolById(toolId);
    if (!tool) {
      return NextResponse.json(
        { success: false, error: `Tool dengan ID '${toolId}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    // 2. Authorization Guard:
    // a. If the tool requires an API key and user did NOT supply their own key in request,
    //    they are attempting to consume server-managed API quota. Require authentication.
    if (tool.requiresApiKey) {
      const userSuppliedKey = apiKeys?.[tool.requiresApiKey];
      if (!userSuppliedKey || typeof userSuppliedKey !== "string" || !userSuppliedKey.trim()) {
        const authCheck = await requireAuth(request);
        if ("errorResponse" in authCheck) {
          return authCheck.errorResponse;
        }
      }
    }

    // b. Developer tools that make server-side network requests (proxy/testing tools)
    //    require authentication to prevent anonymous proxy abuse.
    const serverProxyTools = ["api-tester", "api-data-fetcher"];
    if (serverProxyTools.includes(toolId)) {
      const authCheck = await requireAuth(request);
      if ("errorResponse" in authCheck) {
        return authCheck.errorResponse;
      }
    }

    // 3. Delegate execution to ProviderManager
    const providerResult = await providerManager.executeTool(
      toolId,
      params && typeof params === "object" ? params : {},
      apiKeys && typeof apiKeys === "object" ? apiKeys : {}
    );

    // If provider handled the tool (either success or controlled error)
    if (providerResult && (providerResult.output !== undefined || providerResult.error !== undefined)) {
      return NextResponse.json(providerResult);
    }

    // 4. Fallback to tool clientExecute if defined
    if (typeof tool.clientExecute === "function") {
      const result = await tool.clientExecute(params || {}, apiKeys || {});
      return NextResponse.json(result);
    }

    return NextResponse.json({
      success: true,
      output: `Alat '${tool.name}' berhasil dijalankan.`,
      metadata: { executedAt: new Date().toISOString() },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal saat mengeksekusi tool";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
