import { ApiProviderStatus } from "../../types";

export class GitHubProvider {
  readonly id = "github";
  readonly name = "GitHub API";
  readonly category = "developer" as const;

  private resolveKey(userKey?: string): string {
    return userKey?.trim() || process.env.GITHUB_TOKEN?.trim() || "";
  }

  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "VoidVerse-Tools/2.0",
    };
    const key = this.resolveKey(token);
    if (key) {
      headers.Authorization = `Bearer ${key}`;
    }
    return headers;
  }

  async testConnection(apiKey?: string): Promise<{ status: ApiProviderStatus; message: string }> {
    const key = this.resolveKey(apiKey);

    try {
      if (key) {
        // Authenticated check
        const res = await fetch("https://api.github.com/user", {
          headers: this.getHeaders(key),
        });

        if (res.status === 200) {
          const user = await res.json().catch(() => ({}));
          return {
            status: "connected",
            message: `Terhubung sebagai @${user.login || "user"} (Batas API 5,000 req/jam).`,
          };
        }
        if (res.status === 401) {
          return { status: "error", message: "Personal Access Token GitHub tidak valid (HTTP 401)." };
        }
        if (res.status === 403 || res.status === 429) {
          return { status: "rate_limited", message: "Rate limit GitHub tercapai (HTTP 403/429)." };
        }
        return { status: "error", message: `GitHub merespons status HTTP ${res.status}.` };
      } else {
        // Unauthenticated rate limit check
        const res = await fetch("https://api.github.com/rate_limit", {
          headers: this.getHeaders(),
        });
        if (res.status === 200) {
          const json = await res.json().catch(() => ({}));
          const remaining = json.rate?.remaining ?? 60;
          return {
            status: "connected",
            message: `Akses Publik GitHub Aktif (Sisa kuota: ${remaining}/60 req/jam). Tambahkan token untuk 5,000 req/jam.`,
          };
        }
        if (res.status === 403) {
          return { status: "rate_limited", message: "Rate limit publik GitHub tercapai (60 req/jam). Tambahkan token." };
        }
        return { status: "error", message: `GitHub API status HTTP ${res.status}.` };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi GitHub API";
      return { status: "error", message: `Koneksi gagal: ${msg}` };
    }
  }

  async getUser(username: string, apiKey?: string): Promise<Record<string, any>> {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: this.getHeaders(apiKey),
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Pengguna GitHub '${username}' tidak ditemukan.`);
      }
      if (res.status === 403) {
        throw new Error("GitHub API Rate limit tercapai. Tambahkan GitHub Token.");
      }
      throw new Error(`GitHub Error: HTTP ${res.status}`);
    }

    return await res.json();
  }

  async searchRepos(query: string, apiKey?: string): Promise<{ totalCount: number; items: any[] }> {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
      {
        headers: this.getHeaders(apiKey),
      }
    );

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error("GitHub Search Rate limit tercapai. Tambahkan GitHub Token.");
      }
      throw new Error(`GitHub Search Error: HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      totalCount: data.total_count,
      items: (data.items || []).map((repo: any) => ({
        name: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        url: repo.html_url,
      })),
    };
  }

  async getRepo(owner: string, repo: string, apiKey?: string): Promise<Record<string, any>> {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: this.getHeaders(apiKey),
    });

    if (!res.ok) {
      throw new Error(`Repositori ${owner}/${repo} tidak ditemukan atau private.`);
    }

    return await res.json();
  }
}

export const gitHubProvider = new GitHubProvider();
