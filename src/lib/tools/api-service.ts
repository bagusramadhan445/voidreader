import { ToolDefinition, ToolExecutionResult, ApiProviderStatus } from "./types";
import { getApiKeysMap } from "./storage";
import { ProviderStatusCard } from "./providers/provider-manager";

export class ToolApiService {
  /**
   * Executes a tool through the Provider Manager or Client-side logic
   * Flow: Tool -> Provider Manager -> External API -> Response Parser -> ToolRunner
   */
  async executeTool(
    tool: ToolDefinition,
    params: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const startTime = performance.now();
    const apiKeys = getApiKeysMap();

    try {
      // Determine if tool must go through backend Provider Manager
      const requiresBackend =
        tool.categoryId === "ai" ||
        tool.categoryId === "scraper" ||
        tool.categoryId === "downloader" ||
        tool.categoryId === "document" ||
        tool.id === "background-remover" ||
        tool.id === "image-upscaler" ||
        tool.id === "screenshot-analyzer" ||
        tool.id === "image-metadata-viewer" ||
        tool.id === "image-color-extractor" ||
        tool.id === "api-tester" ||
        Boolean(tool.requiresApiKey);

      // 1. Pure client-side tool execution (e.g. JSON Formatter, Base64, UUID, QR Code, Color Converter)
      if (!requiresBackend && typeof tool.clientExecute === "function") {
        const result = await tool.clientExecute(params, apiKeys);
        const duration = Math.round(performance.now() - startTime);
        return {
          ...result,
          executionTimeMs: result.executionTimeMs ?? duration,
        };
      }

      // 2. Dispatch to server-side Provider Manager via /api/tools/execute
      const res = await fetch("/api/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: tool.id,
          params,
          apiKeys,
        }),
      });

      const json = await res.json();
      const duration = Math.round(performance.now() - startTime);

      if (json.success) {
        return {
          success: true,
          output: json.output,
          outputType: json.outputType || tool.outputType || "text",
          errorCode: json.errorCode || "SUCCESS",
          executionTimeMs: duration,
          metadata: json.metadata,
        };
      } else {
        return {
          success: false,
          error: json.error || "Gagal menjalankan alat utilitas.",
          errorCode: json.errorCode || "PROVIDER_ERROR",
          executionTimeMs: duration,
        };
      }
    } catch (err: unknown) {
      const duration = Math.round(performance.now() - startTime);
      const message = err instanceof Error ? err.message : "Terjadi kesalahan koneksi ke server VoidVerse.";
      return {
        success: false,
        error: message,
        errorCode: "NETWORK_ERROR",
        executionTimeMs: duration,
      };
    }
  }

  /**
   * Fetches live statuses for all providers
   */
  async fetchProviderStatuses(): Promise<ProviderStatusCard[]> {
    const apiKeys = getApiKeysMap();
    try {
      const res = await fetch("/api/tools/providers/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userKeys: apiKeys }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.providers)) {
        return data.providers;
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch provider statuses:", err);
      return [];
    }
  }

  /**
   * Tests an individual API provider key via the backend
   */
  async testProviderApiKey(
    providerId: string,
    apiKey: string,
    baseUrl?: string
  ): Promise<{ valid: boolean; status: ApiProviderStatus; message: string }> {
    try {
      const res = await fetch("/api/tools/providers/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testProviderId: providerId,
          apiKey,
          baseUrl,
        }),
      });

      const data = await res.json();
      const status: ApiProviderStatus = data.status || "untested";
      return {
        valid: status === "connected",
        status,
        message: data.message || `Status: ${status}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menguji provider";
      return {
        valid: false,
        status: "error",
        message: `Koneksi gagal: ${msg}`,
      };
    }
  }

  /**
   * Fetches admin downloader provider configs from backend (keys are masked)
   */
  async fetchDownloaderConfigs() {
    try {
      const res = await fetch("/api/tools/downloader/config");
      const json = await res.json();
      if (json.success && Array.isArray(json.providers)) {
        return json.providers;
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch downloader configs:", err);
      return [];
    }
  }

  /**
   * Saves admin downloader provider config on server
   */
  async saveDownloaderConfig(
    id: string,
    updates: {
      enabled?: boolean;
      apiKey?: string;
      baseUrl?: string;
      endpoint?: string;
      authHeaderName?: string;
    }
  ) {
    const res = await fetch("/api/tools/downloader/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    return await res.json();
  }

  /**
   * Tests a downloader provider connection on server
   */
  async testDownloaderProvider(providerId: string) {
    const res = await fetch("/api/tools/downloader/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId }),
    });
    return await res.json();
  }

  /**
   * Resolves a download URL through Downloader Provider Manager
   */
  async resolveDownloaderUrl(url: string) {
    const res = await fetch("/api/tools/downloader/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return await res.json();
  }
}

export const toolApiService = new ToolApiService();

