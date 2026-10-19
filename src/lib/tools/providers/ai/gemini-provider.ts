import { ApiProviderStatus } from "../../types";

export interface GeminiGenerateOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
}

export class GeminiProvider {
  readonly id = "gemini";
  readonly name = "Google Gemini API";
  readonly category = "ai" as const;

  private resolveKey(userKey?: string): string {
    return userKey?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
  }

  async testConnection(apiKey?: string): Promise<{ status: ApiProviderStatus; message: string }> {
    const key = this.resolveKey(apiKey);
    if (!key) {
      return { status: "missing_key", message: "Kunci API Google Gemini belum dikonfigurasi." };
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        { method: "GET" }
      );

      if (res.status === 200) {
        return { status: "connected", message: "Terhubung ke Google Gemini API (Model siap)." };
      }
      if (res.status === 429) {
        return { status: "rate_limited", message: "Batas kuota/rate limit Gemini tercapai (HTTP 429)." };
      }
      if (res.status === 400 || res.status === 403) {
        return { status: "error", message: "Kunci API Google Gemini tidak valid atau izin ditolak." };
      }

      return { status: "error", message: `Gemini API merespons status HTTP ${res.status}.` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi Gemini API";
      return { status: "error", message: `Koneksi gagal: ${msg}` };
    }
  }

  async generateContent(options: GeminiGenerateOptions): Promise<{
    text: string;
    model: string;
    candidatesCount?: number;
  }> {
    const key = this.resolveKey(options.apiKey);
    if (!key) {
      throw new Error("Google Gemini API Key diperlukan. Harap atur di Pengaturan -> Void Tools -> Konfigurasi API.");
    }

    const model = options.model || "gemini-1.5-flash";
    const body: Record<string, any> = {
      contents: [
        {
          role: "user",
          parts: [{ text: options.prompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
      },
    };

    if (options.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
      if (res.status === 429) {
        throw new Error(`Google Gemini Rate Limit: ${errMsg}`);
      }
      throw new Error(`Google Gemini Error: ${errMsg}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error("Google Gemini tidak menghasilkan output teks.");
    }

    return {
      text: textPart,
      model,
      candidatesCount: data.candidates?.length,
    };
  }
}

export const geminiProvider = new GeminiProvider();
