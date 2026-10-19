import { ApiProviderStatus } from "../../types";

export interface RemoveBgOptions {
  imageUrl?: string;
  imageBase64?: string;
  size?: "preview" | "full" | "auto";
  apiKey?: string;
}

export class RemoveBgProvider {
  readonly id = "remove_bg";
  readonly name = "Remove.bg API";
  readonly category = "image" as const;

  private resolveKey(userKey?: string): string {
    return userKey?.trim() || process.env.REMOVE_BG_API_KEY?.trim() || "";
  }

  async testConnection(apiKey?: string): Promise<{ status: ApiProviderStatus; message: string }> {
    const key = this.resolveKey(apiKey);
    if (!key) {
      return { status: "missing_key", message: "Kunci API Remove.bg belum dikonfigurasi." };
    }

    try {
      const res = await fetch("https://api.remove.bg/v1.0/account", {
        headers: {
          "X-Api-Key": key,
        },
      });

      if (res.status === 200) {
        const json = await res.json().catch(() => ({}));
        const credits = json.data?.attributes?.credits?.total ?? "Aktif";
        return {
          status: "connected",
          message: `Terhubung ke Remove.bg (Sisa kredit: ${credits}).`,
        };
      }
      if (res.status === 429) {
        return { status: "rate_limited", message: "Batas rate limit Remove.bg tercapai (HTTP 429)." };
      }
      if (res.status === 401 || res.status === 403) {
        return { status: "error", message: "Kunci API Remove.bg tidak valid atau kadaluarsa." };
      }

      return { status: "error", message: `Remove.bg merespons status HTTP ${res.status}.` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi Remove.bg API";
      return { status: "error", message: `Koneksi gagal: ${msg}` };
    }
  }

  async removeBackground(options: RemoveBgOptions): Promise<{
    imageBase64: string;
    contentType: string;
  }> {
    const key = this.resolveKey(options.apiKey);
    if (!key) {
      throw new Error("Remove.bg API Key diperlukan. Harap atur di Pengaturan -> Void Tools -> Konfigurasi API.");
    }

    const payload: Record<string, string> = {
      size: options.size || "auto",
      format: "png",
    };

    if (options.imageUrl) {
      payload.image_url = options.imageUrl;
    } else if (options.imageBase64) {
      // Strip data:image/...;base64, prefix if present
      const cleanB64 = options.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      payload.image_file_b64 = cleanB64;
    } else {
      throw new Error("Parameter imageUrl atau imageBase64 wajib disertakan.");
    }

    const res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.errors?.[0]?.title || `HTTP ${res.status}`;
      if (res.status === 429) {
        throw new Error(`Remove.bg Rate Limit: ${errMsg}`);
      }
      throw new Error(`Remove.bg Error: ${errMsg}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return {
      imageBase64: `data:image/png;base64,${base64}`,
      contentType: "image/png",
    };
  }
}

export const removeBgProvider = new RemoveBgProvider();
