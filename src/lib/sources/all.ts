import * as cheerio from "cheerio";
import { appCache } from "../cache";
import { normalizeImageUrl } from "../image-utils";
import {
  ChapterPages,
  HomeData,
  MangaDetail,
  MangaItem,
  MangaSource,
  SearchFilters,
} from "./types";
import { parseChapterNumber } from "./chapter-utils";
import { KomikuSource } from "./komiku";
import { KomikcastSource } from "./komikcast";
import { ShinigamiSource } from "./shinigami";
import { WebtoonSource } from "./webtoon";

function urlToWebtoonSlug(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://www.webtoons.com${url}`);
    const titleNo = parsed.searchParams.get("title_no") || "0";
    const pathParts = parsed.pathname.replace(/^\/id\//, "").split("/").filter(Boolean);
    const genre = pathParts[0] || "action";
    const titleSlug = pathParts[1] || "manga";
    return `webtoon--${genre}--${titleSlug}--${titleNo}`;
  } catch {
    return `webtoon--action--manga--${encodeURIComponent(url)}`;
  }
}

function proxyWebtoonImage(imgUrl?: string): string {
  if (!imgUrl) return "/placeholder.jpg";
  const trimmed = imgUrl.trim();
  if (!trimmed || trimmed.startsWith("/placeholder")) return "/placeholder.jpg";
  return `/api/proxy/image?url=${encodeURIComponent(trimmed)}`;
}

export class AllSourcesAggregator implements MangaSource {
  readonly id = "all";
  readonly name = "Semua Sumber (Multi-Source)";
  readonly baseUrl = "https://voidverse.my.id";

  private komiku: KomikuSource;
  private komikcast: KomikcastSource;
  private shinigami: ShinigamiSource;
  private webtoon: WebtoonSource;

  constructor(
    komiku: KomikuSource,
    komikcast: KomikcastSource,
    shinigami: ShinigamiSource,
    webtoon: WebtoonSource
  ) {
    this.komiku = komiku;
    this.komikcast = komikcast;
    this.shinigami = shinigami;
    this.webtoon = webtoon;
  }

  /**
   * Helper: fetches Komiku manga catalog pages
   */
  private async fetchKomikuMangaPage(page: number): Promise<MangaItem[]> {
    try {
      const res = await fetch(`https://komiku.org/manga/page/${page}/`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (!res.ok) return [];
      const html = await res.text();
      const $ = cheerio.load(html);
      const items: MangaItem[] = [];

      $(".bge").each((_, el) => {
        const link = $(el).find(".kan h3 a").first();
        const href = link.attr("href");
        if (!href) return;
        const id = href.replace(/^https?:\/\/[^/]+\/manga\//, "").replace(/\/$/, "").trim();
        const title = link.text().trim();
        if (!title) return;

        const imgEl = $(el).find(".bgei img");
        const rawImg =
          imgEl.attr("data-src") ||
          imgEl.attr("data-original") ||
          imgEl.attr("data-lazy-src") ||
          imgEl.attr("srcset") ||
          imgEl.attr("src") ||
          "";
        const cover = normalizeImageUrl(rawImg, "https://komiku.org");
        const latestCh = $(el).find(".kan .new a span:last-child, .kan .new").first().text().trim();
        const desc = $(el).find(".kan p").text().trim();

        const flagSrc = $(el).find(".kan .flag").attr("src") || "";
        let type = "Manga";
        if (flagSrc.includes("kr")) type = "Manhwa";
        else if (flagSrc.includes("cn")) type = "Manhua";

        items.push({
          id,
          title,
          cover,
          thumbnail: cover,
          image: cover,
          poster: cover,
          banner: cover,
          type,
          latestChapter: latestCh || undefined,
          synopsis: desc || undefined,
          sourceId: "komiku",
        });
      });

      return items;
    } catch {
      return [];
    }
  }

  /**
   * Helper: fetches LINE Webtoon Originals with up-to-date episode numbers for UP items
   */
  private async fetchWebtoonLatestWithEpisodes(): Promise<MangaItem[]> {
    try {
      const res = await fetch("https://www.webtoons.com/id/originals", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (!res.ok) return [];
      const html = await res.text();
      const $ = cheerio.load(html);

      const upLi = $("li")
        .filter((_, el) => $(el).find(".bullet_up").length > 0)
        .slice(0, 25);

      const items: (MangaItem | null)[] = await Promise.all(
        upLi.toArray().map(async (el) => {
          const $el = $(el);
          const link = $el.find('a[href*="title_no="]').first().attr("href");
          if (!link) return null;
          const title =
            $el.find(".subj, .title").first().text().trim() ||
            $el.find("img").attr("alt");
          if (!title) return null;

          const mangaId = urlToWebtoonSlug(link);
          const rawImg = $el.find("img").attr("src");
          const cover = proxyWebtoonImage(rawImg);
          const author = $el.find(".author").text().trim();
          const genre = $el.find(".genre").text().trim();

          let latestChapter = "Episode Baru (UP)";
          try {
            const pageRes = await fetch(link, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            });
            const pageHtml = await pageRes.text();
            const page$ = cheerio.load(pageHtml);
            const firstEp = page$("#_listUl li").first();
            const tx = firstEp.find(".tx").text().trim();
            if (tx) {
              latestChapter = `Episode ${tx.replace("#", "")}`;
            }
          } catch {}

          const item: MangaItem = {
            id: mangaId,
            slug: mangaId,
            title,
            cover,
            thumbnail: cover,
            image: cover,
            poster: cover,
            banner: cover,
            type: "Webtoon",
            author: author || undefined,
            genres: [genre || "Webtoon"],
            status: "Ongoing",
            sourceId: "webtoon",
            latestChapter,
          };
          return item;
        })
      );

      return items.filter((x): x is MangaItem => x !== null);
    } catch {
      return [];
    }
  }

  /**
   * Aggregates latest chapter updates across ALL sources (Komiku, Komikcast, Shinigami, Webtoon),
   * returning up to `limit` items (default 200) sorted strictly from newest chapter (highest number)
   * to oldest ("dari ch baru ke yang paling lama").
   */
  async getLatest(_page = 1, limit = 200): Promise<MangaItem[]> {
    const cacheKey = `all_sources_latest_${limit}_v2`;
    const cached = appCache.get<MangaItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const [
        kc1, kc2, kc3, kc4, kc5,
        s1, s2, s3, s4, s5,
        kLatest, kP1, kP2,
        wWithEpisodes, wFallbackLatest
      ] = await Promise.all([
        this.komikcast.getLatest(1).catch(() => []),
        this.komikcast.getLatest(2).catch(() => []),
        this.komikcast.getLatest(3).catch(() => []),
        this.komikcast.getLatest(4).catch(() => []),
        this.komikcast.getLatest(5).catch(() => []),
        this.shinigami.getLatest(1).catch(() => []),
        this.shinigami.getLatest(2).catch(() => []),
        this.shinigami.getLatest(3).catch(() => []),
        this.shinigami.getLatest(4).catch(() => []),
        this.shinigami.getLatest(5).catch(() => []),
        this.komiku.getLatest().catch(() => []),
        this.fetchKomikuMangaPage(1).catch(() => []),
        this.fetchKomikuMangaPage(2).catch(() => []),
        this.fetchWebtoonLatestWithEpisodes().catch(() => []),
        this.webtoon.getLatest(1).catch(() => []),
      ]);

      const allItems: MangaItem[] = [
        ...kc1, ...kc2, ...kc3, ...kc4, ...kc5,
        ...s1, ...s2, ...s3, ...s4, ...s5,
        ...kLatest, ...kP1, ...kP2,
        ...wWithEpisodes,
        ...wFallbackLatest,
      ];

      // Deduplicate by sourceId:id
      const map = new Map<string, MangaItem>();
      for (const item of allItems) {
        if (!item || !item.id) continue;
        const key = `${item.sourceId || "all"}:${item.id}`;
        if (!map.has(key)) {
          map.set(key, item);
        }
      }

      const deduped = Array.from(map.values());

      // Sort strictly from newest chapter (highest chapter number) down to oldest
      deduped.sort((a, b) => {
        const numA = parseChapterNumber(a.latestChapter);
        const numB = parseChapterNumber(b.latestChapter);

        if (numA !== null && numB !== null) {
          if (numA !== numB) {
            return numB - numA; // newest / highest chapter first
          }
        } else if (numA !== null && numB === null) {
          return -1;
        } else if (numA === null && numB !== null) {
          return 1;
        }

        // Secondary fallback: updatedAt timestamp (newest date first)
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (dateA && dateB && dateA !== dateB) {
          return dateB - dateA;
        }

        return (a.title || "").localeCompare(b.title || "");
      });

      const result = deduped.slice(0, limit);
      appCache.set(cacheKey, result, 300); // cache for 5 minutes
      return result;
    } catch (err) {
      console.error("[AllSourcesAggregator] getLatest error:", err);
      return [];
    }
  }

  /**
   * Home Data aggregating all sources with 200 latest updates
   */
  async getHome(): Promise<HomeData> {
    const cacheKey = "all_sources_home_v2";
    const cached = appCache.get<HomeData>(cacheKey);
    if (cached) return cached;

    try {
      const [latest200, kcHome, sHome, kHome, wHome] = await Promise.all([
        this.getLatest(1, 200),
        this.komikcast.getHome().catch(() => null),
        this.shinigami.getHome().catch(() => null),
        this.komiku.getHome().catch(() => null),
        this.webtoon.getHome().catch(() => null),
      ]);

      const featured: MangaItem[] = [];
      const popular: MangaItem[] = [];
      const recommendations: MangaItem[] = [];

      const homes = [kcHome, sHome, kHome, wHome].filter(Boolean);
      homes.forEach((h) => {
        if (!h) return;
        if (Array.isArray(h.featured)) featured.push(...h.featured);
        if (Array.isArray(h.popular)) popular.push(...h.popular);
        if (Array.isArray(h.recommendations)) recommendations.push(...h.recommendations);
      });

      const dedupList = (list: MangaItem[]) => {
        const m = new Map<string, MangaItem>();
        for (const item of list) {
          const key = `${item.sourceId || "all"}:${item.id}`;
          if (!m.has(key)) m.set(key, item);
        }
        return Array.from(m.values());
      };

      const homeData: HomeData = {
        featured: dedupList(featured).slice(0, 10),
        popular: dedupList(popular).slice(0, 20),
        latest: latest200, // 200 items sorted from newest chapter to oldest
        recommendations: dedupList(recommendations).slice(0, 20),
      };

      appCache.set(cacheKey, homeData, 300);
      return homeData;
    } catch (err) {
      console.error("[AllSourcesAggregator] getHome error:", err);
      return {
        featured: [],
        popular: [],
        latest: [],
        recommendations: [],
      };
    }
  }

  /**
   * Combines popular items across all sources
   */
  async getPopular(page = 1): Promise<MangaItem[]> {
    try {
      const [k, kc, s, w] = await Promise.allSettled([
        this.komiku.getPopular ? this.komiku.getPopular() : Promise.resolve([]),
        this.komikcast.getPopular(page),
        this.shinigami.getPopular(page),
        this.webtoon.getPopular(page),
      ]);

      const items: MangaItem[] = [];
      if (k.status === "fulfilled") items.push(...k.value);
      if (kc.status === "fulfilled") items.push(...kc.value);
      if (s.status === "fulfilled") items.push(...s.value);
      if (w.status === "fulfilled") items.push(...w.value);

      const map = new Map<string, MangaItem>();
      for (const item of items) {
        const key = `${item.sourceId || "all"}:${item.id}`;
        if (!map.has(key)) map.set(key, item);
      }
      return Array.from(map.values());
    } catch {
      return [];
    }
  }

  /**
   * Searches across all sources concurrently
   */
  async search(filters: SearchFilters): Promise<MangaItem[]> {
    if (!filters.query && !filters.genre && filters.type === "all" && filters.status === "all") {
      return this.getLatest(filters.page || 1, 200);
    }

    try {
      const [kRes, kcRes, sRes, wRes] = await Promise.allSettled([
        this.komiku.search(filters),
        this.komikcast.search(filters),
        this.shinigami.search(filters),
        this.webtoon.search(filters),
      ]);

      const items: MangaItem[] = [];
      if (kRes.status === "fulfilled") items.push(...kRes.value);
      if (kcRes.status === "fulfilled") items.push(...kcRes.value);
      if (sRes.status === "fulfilled") items.push(...sRes.value);
      if (wRes.status === "fulfilled") items.push(...wRes.value);

      const map = new Map<string, MangaItem>();
      for (const item of items) {
        const key = `${item.sourceId || "all"}:${item.id}`;
        if (!map.has(key)) map.set(key, item);
      }
      return Array.from(map.values());
    } catch {
      return [];
    }
  }

  /**
   * Detail delegates to the appropriate source
   */
  async getDetail(slug: string): Promise<MangaDetail> {
    if (slug.startsWith("webtoon")) return this.webtoon.getDetail(slug);
    if (/^[0-9a-f-]{36}$/i.test(slug)) return this.shinigami.getDetail(slug);

    try {
      return await this.komikcast.getDetail(slug);
    } catch {
      try {
        return await this.komiku.getDetail(slug);
      } catch {
        return await this.shinigami.getDetail(slug);
      }
    }
  }

  /**
   * Chapter pages delegate to the appropriate source
   */
  async getChapterPages(chapterSlug: string): Promise<ChapterPages> {
    if (chapterSlug.startsWith("webtoon")) return this.webtoon.getChapterPages(chapterSlug);
    if (/^[0-9a-f-]{36}$/i.test(chapterSlug)) return this.shinigami.getChapterPages(chapterSlug);

    try {
      return await this.komikcast.getChapterPages(chapterSlug);
    } catch {
      try {
        return await this.komiku.getChapterPages(chapterSlug);
      } catch {
        return await this.shinigami.getChapterPages(chapterSlug);
      }
    }
  }
}
