import * as cheerio from "cheerio";
import { ApiProviderStatus } from "../../types";
import { isSafeDestination, safeSsrfFetch } from "@/lib/security/ssrf";

export interface RssFeedItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  author?: string;
}

export interface RssFeedResult {
  title: string;
  description?: string;
  link?: string;
  itemCount: number;
  items: RssFeedItem[];
}

export class RssProvider {
  readonly id = "rss";
  readonly name = "RSS / Atom Feed Parser";
  readonly category = "data" as const;

  async testConnection(testUrl: string = "https://news.ycombinator.com/rss"): Promise<{
    status: ApiProviderStatus;
    message: string;
  }> {
    try {
      const parsed = new URL(testUrl);
      const safeCheck = await isSafeDestination(parsed);
      if (!safeCheck.safe) {
        return { status: "error", message: `URL tidak aman: ${safeCheck.reason}` };
      }

      const res = await safeSsrfFetch(testUrl, {
        headers: { "User-Agent": "VoidVerse-RSS-Reader/2.0" },
        timeoutMs: 8000,
        maxSizeBytes: 2 * 1024 * 1024,
      });

      if (res.ok) {
        return { status: "connected", message: "RSS Feed Engine Aktif (Parser XML siap digunakan)." };
      }
      return { status: "error", message: `Gagal memuat feed: HTTP ${res.status}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal terhubung";
      return { status: "error", message: `RSS connection error: ${msg}` };
    }
  }

  async parseFeed(feedUrl: string, limit: number = 20): Promise<RssFeedResult> {
    const trimmed = feedUrl.trim();
    if (!trimmed) {
      throw new Error("URL Feed RSS/Atom tidak boleh kosong.");
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error("Format URL Feed tidak valid.");
    }

    const safeCheck = await isSafeDestination(parsed);
    if (!safeCheck.safe) {
      throw new Error(`URL target tidak diizinkan: ${safeCheck.reason}`);
    }

    const res = await safeSsrfFetch(trimmed, {
      headers: {
        "User-Agent": "VoidVerse-RSS-Reader/2.0 (Mozilla/5.0)",
        Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
      },
      timeoutMs: 10000,
      maxSizeBytes: 8 * 1024 * 1024,
    });

    if (!res.ok) {
      throw new Error(`Gagal mengunduh feed: HTTP ${res.status} (${res.statusText})`);
    }

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    // Check if RSS or Atom
    const channelTitle = $("channel > title").text().trim() || $("feed > title").text().trim() || "RSS Feed";
    const channelDesc = $("channel > description").text().trim() || $("feed > subtitle").text().trim() || "";
    const channelLink = $("channel > link").text().trim() || $("feed > link").attr("href") || trimmed;

    const items: RssFeedItem[] = [];

    // RSS items
    $("item").each((_, el) => {
      if (items.length >= limit) return false;
      const $el = $(el);
      const title = $el.find("title").text().trim();
      const link = $el.find("link").text().trim();
      const pubDate = $el.find("pubDate").text().trim();
      const rawDesc = $el.find("description").text().trim();
      const cleanDesc = rawDesc.replace(/<[^>]*>/g, "").slice(0, 300);
      const author = $el.find("author").text().trim() || $el.find("dc\\:creator").text().trim();

      if (title || link) {
        items.push({
          title: title || "Tanpa Judul",
          link,
          pubDate,
          description: cleanDesc,
          author,
        });
      }
    });

    // Atom entries fallback
    if (items.length === 0) {
      $("entry").each((_, el) => {
        if (items.length >= limit) return false;
        const $el = $(el);
        const title = $el.find("title").text().trim();
        const link = $el.find("link").attr("href") || $el.find("link").text().trim();
        const pubDate = $el.find("updated").text().trim() || $el.find("published").text().trim();
        const rawSummary = $el.find("summary").text().trim() || $el.find("content").text().trim();
        const cleanDesc = rawSummary.replace(/<[^>]*>/g, "").slice(0, 300);
        const author = $el.find("author > name").text().trim();

        if (title || link) {
          items.push({
            title: title || "Tanpa Judul",
            link,
            pubDate,
            description: cleanDesc,
            author,
          });
        }
      });
    }

    if (items.length === 0 && !channelDesc && channelTitle === "RSS Feed") {
      throw new Error("Dokumen yang diunduh tidak memiliki struktur RSS atau Atom XML yang valid.");
    }

    return {
      title: channelTitle,
      description: channelDesc,
      link: channelLink,
      itemCount: items.length,
      items,
    };
  }
}

export const rssProvider = new RssProvider();
