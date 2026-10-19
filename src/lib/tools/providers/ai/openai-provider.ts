import { ApiProviderStatus } from "../../types";
import { isTrustedProviderOrigin } from "@/lib/security/provider-allowlist";

export interface OpenAiChatOptions {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface OpenAiImageOptions {
  prompt: string;
  model?: string;
  size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
  apiKey?: string;
  baseUrl?: string;
}

export const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";

export class OpenAiProvider {
  readonly id = "openai";
  readonly name = "OpenAI API";
  readonly category = "ai" as const;

  resolveKey(userKey?: string, baseUrl?: string): string {
    const trimmedUser = userKey?.trim();
    if (trimmedUser) return trimmedUser;

    const base = this.resolveBaseUrl(baseUrl);
    // If baseUrl is customized and not official OpenAI, NEVER send server environment key
    if (!isTrustedProviderOrigin("openai", base)) {
      return "";
    }

    return process.env.OPENAI_API_KEY?.trim() || "";
  }

  resolveBaseUrl(userUrl?: string): string {
    const raw = userUrl?.trim() || process.env.OPENAI_BASE_URL?.trim() || OPENAI_DEFAULT_BASE_URL;
    return raw.replace(/\/+$/, "");
  }

  async testConnection(
    apiKey?: string,
    baseUrl?: string
  ): Promise<{ status: ApiProviderStatus; message: string }> {
    const base = this.resolveBaseUrl(baseUrl);
    const key = this.resolveKey(apiKey, base);

    if (!key) {
      if (baseUrl && !isTrustedProviderOrigin("openai", base)) {
        return {
          status: "missing_key",
          message: "Base URL kustom memerlukan kunci API Anda sendiri. Kredensial server tidak boleh dikirim ke endpoint kustom.",
        };
      }
      return { status: "missing_key", message: "Kunci API OpenAI belum dikonfigurasi." };
    }

    try {
      const res = await fetch(`${base}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
        },
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 200) {
        return { status: "connected", message: "Terhubung ke OpenAI API (Semua model aktif)." };
      }
      if (res.status === 429) {
        return { status: "rate_limited", message: "Batas kuota/rate limit OpenAI tercapai (HTTP 429)." };
      }
      if (res.status === 401) {
        return { status: "error", message: "Kunci API OpenAI tidak valid (HTTP 401 Unauthorized)." };
      }

      const errText = await res.text();
      return { status: "error", message: `OpenAI error: HTTP ${res.status} - ${errText.slice(0, 100)}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi server OpenAI";
      return { status: "error", message: `Koneksi gagal: ${msg}` };
    }
  }

  async chatCompletion(options: OpenAiChatOptions): Promise<{
    text: string;
    model: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    const base = this.resolveBaseUrl(options.baseUrl);
    const key = this.resolveKey(options.apiKey, base);
    if (!key) {
      throw new Error("OpenAI API Key diperlukan untuk eksekusi ini. Harap atur di Pengaturan -> Void Tools -> Konfigurasi API.");
    }

    const model = options.model || "gpt-4o-mini";

    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 1500,
        temperature: options.temperature ?? 0.7,
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.error?.message || `HTTP ${res.status} (${res.statusText})`;
      if (res.status === 429) {
        throw new Error(`OpenAI Rate Limit tercapai: ${errMsg}`);
      }
      throw new Error(`OpenAI Error: ${errMsg}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    return {
      text,
      model: data.model || model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async generateImage(options: OpenAiImageOptions): Promise<{
    url: string;
    revisedPrompt?: string;
  }> {
    const base = this.resolveBaseUrl(options.baseUrl);
    const key = this.resolveKey(options.apiKey, base);
    if (!key) {
      throw new Error("OpenAI API Key diperlukan untuk membuat gambar dengan DALL-E.");
    }

    const model = options.model || "dall-e-3";

    const res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        prompt: options.prompt,
        n: 1,
        size: options.size || "1024x1024",
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
      throw new Error(`OpenAI DALL-E Error: ${errMsg}`);
    }

    const data = await res.json();
    const item = data.data?.[0];
    if (!item?.url) {
      throw new Error("Gagal menerima URL gambar dari OpenAI.");
    }

    return {
      url: item.url,
      revisedPrompt: item.revised_prompt,
    };
  }
}

export const openAiProvider = new OpenAiProvider();
