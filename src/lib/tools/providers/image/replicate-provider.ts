import { ApiProviderStatus } from "../../types";

export interface ReplicatePredictionOptions {
  model: string;
  input: Record<string, any>;
  apiKey?: string;
}

export class ReplicateProvider {
  readonly id = "replicate";
  readonly name = "Replicate API";
  readonly category = "image" as const;

  private resolveKey(userKey?: string): string {
    return userKey?.trim() || process.env.REPLICATE_API_TOKEN?.trim() || "";
  }

  async testConnection(apiKey?: string): Promise<{ status: ApiProviderStatus; message: string }> {
    const key = this.resolveKey(apiKey);
    if (!key) {
      return { status: "missing_key", message: "Kunci API Replicate belum dikonfigurasi." };
    }

    try {
      const res = await fetch("https://api.replicate.com/v1/account", {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (res.status === 200) {
        const json = await res.json().catch(() => ({}));
        const username = json.username ? ` (@${json.username})` : "";
        return { status: "connected", message: `Terhubung ke Replicate API${username}. Model AI aktif.` };
      }
      if (res.status === 429) {
        return { status: "rate_limited", message: "Batas kuota/rate limit Replicate tercapai (HTTP 429)." };
      }
      if (res.status === 401) {
        return { status: "error", message: "Token Replicate tidak valid (HTTP 401 Unauthorized)." };
      }

      return { status: "error", message: `Replicate merespons status HTTP ${res.status}.` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi Replicate API";
      return { status: "error", message: `Koneksi gagal: ${msg}` };
    }
  }

  async runPrediction(options: ReplicatePredictionOptions): Promise<{
    output: any;
    model: string;
    id?: string;
  }> {
    const key = this.resolveKey(options.apiKey);
    if (!key) {
      throw new Error("Replicate API Token diperlukan. Harap atur di Pengaturan -> Void Tools -> Konfigurasi API.");
    }

    // Call Replicate model prediction with wait header
    const [owner, name] = options.model.split("/");
    const url = owner && name
      ? `https://api.replicate.com/v1/models/${owner}/${name}/predictions`
      : "https://api.replicate.com/v1/predictions";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        Prefer: "wait=50",
      },
      body: JSON.stringify({
        input: options.input,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.detail || `HTTP ${res.status}`;
      if (res.status === 429) {
        throw new Error(`Replicate Rate Limit: ${errMsg}`);
      }
      throw new Error(`Replicate Error: ${errMsg}`);
    }

    const data = await res.json();
    return {
      output: data.output,
      model: options.model,
      id: data.id,
    };
  }

  async generateImage(prompt: string, apiKey?: string): Promise<{ url: string }> {
    const result = await this.runPrediction({
      model: "black-forest-labs/flux-schnell",
      input: { prompt, aspect_ratio: "1:1", num_outputs: 1 },
      apiKey,
    });

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    if (!outputUrl || typeof outputUrl !== "string") {
      throw new Error("Gagal memperoleh URL output gambar dari Replicate Flux.");
    }

    return { url: outputUrl };
  }

  async removeBackground(imageUrl: string, apiKey?: string): Promise<{ url: string }> {
    const result = await this.runPrediction({
      model: "cjwbw/rembg",
      input: { image: imageUrl },
      apiKey,
    });

    const outputUrl = typeof result.output === "string" ? result.output : result.output?.[0];
    if (!outputUrl) {
      throw new Error("Gagal memproses penghapusan latar belakang via Replicate Rembg.");
    }

    return { url: outputUrl };
  }
}

export const replicateProvider = new ReplicateProvider();
