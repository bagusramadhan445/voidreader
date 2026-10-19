import { ApiProviderStatus } from "../../types";
import { isTrustedProviderOrigin } from "@/lib/security/provider-allowlist";

export interface OpenRouterChatOptions {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_DEFAULT_MODEL = "google/gemini-2.5-flash";

export const OPENROUTER_EXAMPLE_MODELS = [
  { id: "google/gemini-2.5-flash", name: "Google Gemini 2.5 Flash (Cepat & Responsif)" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3 / Chat (Hemat & Cerdas)" },
  { id: "openai/gpt-5", name: "OpenAI GPT-5 / Flagship" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Meta Llama 3.3 70B Instruct" },
  { id: "mistralai/mistral-large-2407", name: "Mistral Large" },
];

export class OpenRouterProvider {
  readonly id = "openrouter";
  readonly name = "OpenRouter API";
  readonly category = "ai" as const;

  resolveKey(userKey?: string, baseUrl?: string): string {
    const trimmedUser = userKey?.trim();
    if (trimmedUser) return trimmedUser;

    const base = this.resolveBaseUrl(baseUrl);
    // If baseUrl is customized and not official OpenRouter, NEVER send server environment key
    if (!isTrustedProviderOrigin("openrouter", base)) {
      return "";
    }

    return process.env.OPENROUTER_API_KEY?.trim() || "";
  }

  resolveBaseUrl(userUrl?: string): string {
    const raw = userUrl?.trim() || process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_DEFAULT_BASE_URL;
    return raw.replace(/\/+$/, "");
  }

  resolveModel(userModel?: string): string {
    return userModel?.trim() || process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_DEFAULT_MODEL;
  }

  /**
   * Tests connection to OpenRouter API
   */
  async testConnection(
    apiKey?: string,
    baseUrl?: string
  ): Promise<{ status: ApiProviderStatus; message: string }> {
    const base = this.resolveBaseUrl(baseUrl);
    const key = this.resolveKey(apiKey, base);

    if (!key) {
      if (baseUrl && !isTrustedProviderOrigin("openrouter", base)) {
        return {
          status: "missing_key",
          message: "Base URL kustom memerlukan kunci API Anda sendiri. Kredensial server tidak boleh dikirim ke endpoint kustom.",
        };
      }
      return { status: "missing_key", message: "Kunci API OpenRouter belum dikonfigurasi." };
    }

    try {
      // OpenRouter provides /auth/key to authenticate and verify user keys
      const res = await fetch(`${base}/auth/key`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://voidverse.my.id",
          "X-Title": "VoidVerse",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 200) {
        const data = await res.json().catch(() => null);
        const label = data?.data?.label ? ` [${data.data.label}]` : "";
        return {
          status: "connected",
          message: `Terhubung ke OpenRouter API${label} (Semua model lintas-provider aktif).`,
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          status: "error",
          message: "Kunci API OpenRouter tidak valid (HTTP 401 Unauthorized / User not found).",
        };
      }
      if (res.status === 429) {
        return {
          status: "rate_limited",
          message: "Batas rate limit atau kredit OpenRouter tercapai (HTTP 429).",
        };
      }

      // If /auth/key returned 404 (custom proxy endpoint), fall back to /models
      if (res.status === 404) {
        const modelRes = await fetch(`${base}/models`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": "https://voidverse.my.id",
            "X-Title": "VoidVerse",
          },
          redirect: "manual",
          signal: AbortSignal.timeout(10000),
        });

        if (modelRes.status === 200) {
          return {
            status: "connected",
            message: "Terhubung ke OpenRouter API Proxy (Endpoint aktif).",
          };
        }
        if (modelRes.status === 401 || modelRes.status === 403) {
          return {
            status: "error",
            message: "Kunci API OpenRouter / Proxy tidak valid (HTTP 401 Unauthorized).",
          };
        }
      }

      const errText = await res.text().catch(() => "");
      return {
        status: "error",
        message: `OpenRouter error: HTTP ${res.status} - ${errText.slice(0, 100)}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi OpenRouter API";
      return { status: "error", message: `Koneksi gagal: ${msg}` };
    }
  }

  /**
   * Performs an OpenAI-compatible Chat Completion call to OpenRouter
   * Endpoint: POST /chat/completions
   */
  async chatCompletion(options: OpenRouterChatOptions): Promise<{
    text: string;
    model: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    const base = this.resolveBaseUrl(options.baseUrl);
    const key = this.resolveKey(options.apiKey, base);
    if (!key) {
      throw new Error(
        "OpenRouter API Key diperlukan untuk eksekusi ini. Harap atur di Pengaturan -> Void Tools -> Konfigurasi API."
      );
    }

    const model = this.resolveModel(options.model);

    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://voidverse.my.id",
        "X-Title": "VoidVerse",
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 1500,
        temperature: options.temperature ?? 0.7,
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg =
        errJson?.error?.message || errJson?.message || `HTTP ${res.status} (${res.statusText})`;
      if (res.status === 429) {
        throw new Error(`OpenRouter Rate Limit tercapai: ${errMsg}`);
      }
      if (res.status === 401) {
        throw new Error(`OpenRouter Auth Gagal: ${errMsg}`);
      }
      throw new Error(`OpenRouter API Error: ${errMsg}`);
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || "";
    return {
      text,
      model: json.model || model,
      usage: json.usage
        ? {
            promptTokens: json.usage.prompt_tokens,
            completionTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens,
          }
        : undefined,
    };
  }
}

export const openRouterProvider = new OpenRouterProvider();
