import * as cheerio from "cheerio";
import { appCache } from "../cache";
import { normalizeImageUrl } from "../image-utils";
import {
  Chapter,
  ChapterPages,
  HomeData,
  MangaDetail,
  MangaItem,
  MangaSource,
  SearchFilters,
} from "./types";
import { sortChapters } from "./chapter-utils";

/**
 * Extracts raw image URL from Cheerio img element supporting all lazy loading techniques:
 * - data-src
 * - data-original
 * - data-lazy-src
 * - srcset / data-srcset
 * - src
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractImageFromElement(imgEl: cheerio.Cheerio<any>): string {
  if (!imgEl || imgEl.length === 0) return "";

  // Prioritize real lazy attributes over dummy placeholder src
  const dataSrc = imgEl.attr("data-src");
  if (dataSrc && !dataSrc.includes("lazy.jpg") && !dataSrc.startsWith("data:image")) {
    return dataSrc;
  }

  const dataOriginal = imgEl.attr("data-original");
  if (dataOriginal && !dataOriginal.includes("lazy.jpg") && !dataOriginal.startsWith("data:image")) {
    return dataOriginal;
  }

  const dataLazySrc = imgEl.attr("data-lazy-src");
  if (dataLazySrc && !dataLazySrc.includes("lazy.jpg") && !dataLazySrc.startsWith("data:image")) {
    return dataLazySrc;
  }

  const srcset = imgEl.attr("data-srcset") || imgEl.attr("srcset");
  if (srcset && !srcset.includes("lazy.jpg") && !srcset.startsWith("data:image")) {
    return srcset;
  }

  const src = imgEl.attr("src");
  if (src && !src.includes("lazy.jpg") && !src.startsWith("data:image")) {
    return src;
  }

  return dataSrc || dataOriginal || dataLazySrc || src || "";
}

export class KomikuSource implements MangaSource {
  readonly id = "komiku";
  readonly name = "Komiku ID";
  readonly baseUrl = "https://komiku.org";
  readonly apiBaseUrl = "https://api.komiku.org";

  private cleanSlug(urlOrSlug: string): string {
    return urlOrSlug
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/manga\//i, "")
      .replace(/^\/ch\//i, "")
      .replace(/^\//, "")
      .replace(/\/$/, "");
  }

  private cleanText(text: string | null | undefined): string {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractMangaItemFromBge($: cheerio.CheerioAPI, el: any): MangaItem | null {
    const item = $(el);
    const linkEl = item.find(".kan a").first();
    const href = linkEl.attr("href") || item.find(".bgei a").attr("href");
    if (!href) return null;

    const id = this.cleanSlug(href);
    const title = this.cleanText(item.find(".kan h3").text() || item.find(".kan h4").text());
    if (!title) return null;

    const imgEl = item.find(".bgei img");
    const rawImg = extractImageFromElement(imgEl);
    const coverUrl = normalizeImageUrl(rawImg);

    console.log({
      title,
      extractedImage: coverUrl,
    });

    const typeInf = this.cleanText(item.find(".tpe1_inf").text());
    let type = "Manga";
    if (typeInf.toLowerCase().includes("manhwa")) type = "Manhwa";
    else if (typeInf.toLowerCase().includes("manhua")) type = "Manhua";

    const genre = typeInf.replace(/(Manga|Manhwa|Manhua)/gi, "").trim();

    // Latest chapter
    const latestChapter = this.cleanText(item.find(".new1").last().text());
    const firstChapter = this.cleanText(item.find(".new1").first().text());
    const updatedAt = this.cleanText(item.find(".kan p").text());

    return {
      id,
      title,
      cover: coverUrl,
      image: coverUrl,
      thumbnail: coverUrl,
      poster: coverUrl,
      banner: coverUrl,
      type,
      genres: genre ? [genre] : [],
      latestChapter: latestChapter || undefined,
      firstChapter: firstChapter || undefined,
      updatedAt: updatedAt || undefined,
      sourceId: this.id,
    };
  }

  async getHome(): Promise<HomeData> {
    const cacheKey = "komiku_home_v3";
    const cached = appCache.get<HomeData>(cacheKey);
    if (cached) return cached;

    const [latest, popular, recommendations] = await Promise.all([
      this.getLatest(),
      this.getPopular(),
      this.getRecommendations(),
    ]);

    const featured = popular.slice(0, 5);

    const homeData: HomeData = {
      featured,
      popular,
      latest,
      recommendations,
    };

    appCache.set(cacheKey, homeData, 300); // 5 min cache
    return homeData;
  }

  async getPopular(): Promise<MangaItem[]> {
    const cacheKey = "komiku_popular_v3";
    const cached = appCache.get<MangaItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.apiBaseUrl}/other/hot/`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      const items: MangaItem[] = [];
      $(".bge").each((_, el) => {
        const parsed = this.extractMangaItemFromBge($, el);
        if (parsed) items.push(parsed);
      });

      appCache.set(cacheKey, items, 600);
      return items;
    } catch (error) {
      console.error("[KomikuSource] Error fetching popular:", error);
      return [];
    }
  }

  async getRecommendations(): Promise<MangaItem[]> {
    const cacheKey = "komiku_recommendations_v3";
    const cached = appCache.get<MangaItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.apiBaseUrl}/other/rekomendasi/`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      const items: MangaItem[] = [];
      $(".bge").each((_, el) => {
        const parsed = this.extractMangaItemFromBge($, el);
        if (parsed) items.push(parsed);
      });

      appCache.set(cacheKey, items, 600);
      return items;
    } catch (error) {
      console.error("[KomikuSource] Error fetching recommendations:", error);
      return [];
    }
  }

  async getLatest(): Promise<MangaItem[]> {
    const cacheKey = "komiku_latest_v3";
    const cached = appCache.get<MangaItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(this.baseUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      const items: MangaItem[] = [];
      $("#Terbaru article.ls2, .ls2-wrap article.ls2").each((_, el) => {
        const item = $(el);
        const link = item.find(".ls2j h3 a").first();
        const href = link.attr("href");
        if (!href) return;

        const id = this.cleanSlug(href);
        const title = this.cleanText(link.text() || link.attr("title"));
        if (!title) return;

        const imgEl = item.find(".ls2v img");
        const rawImg = extractImageFromElement(imgEl);
        const coverUrl = normalizeImageUrl(rawImg);

        console.log({
          title,
          extractedImage: coverUrl,
        });

        const latestCh = this.cleanText(item.find(".ls2j .ls2l").text());
        const desc = this.cleanText(item.find(".ls2j p").text());

        // Check flag to determine type
        const flagSrc = item.find(".flag").attr("src") || "";
        let type = "Manga";
        if (flagSrc.includes("kr")) type = "Manhwa";
        else if (flagSrc.includes("cn")) type = "Manhua";

        items.push({
          id,
          title,
          cover: coverUrl,
          image: coverUrl,
          thumbnail: coverUrl,
          poster: coverUrl,
          banner: coverUrl,
          type,
          latestChapter: latestCh || undefined,
          synopsis: desc || undefined,
          sourceId: this.id,
        });
      });

      appCache.set(cacheKey, items, 180);
      return items;
    } catch (error) {
      console.error("[KomikuSource] Error fetching latest:", error);
      return [];
    }
  }

  async search(filters: SearchFilters): Promise<MangaItem[]> {
    const { query, genre } = filters;
    const cacheKey = `komiku_search_v3_${query || ""}_${genre || ""}`;
    const cached = appCache.get<MangaItem[]>(cacheKey);
    if (cached) return cached;

    let targetUrl = `${this.apiBaseUrl}/other/hot/`;
    if (query && query.trim()) {
      targetUrl = `${this.apiBaseUrl}/?post_type=manga&s=${encodeURIComponent(query.trim())}`;
    } else if (genre && genre.trim()) {
      targetUrl = `${this.apiBaseUrl}/genre/${encodeURIComponent(genre.toLowerCase().trim())}/`;
    }

    try {
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      const items: MangaItem[] = [];
      $(".bge").each((_, el) => {
        const parsed = this.extractMangaItemFromBge($, el);
        if (parsed) items.push(parsed);
      });

      let results = items;
      if (filters.type && filters.type !== "all") {
        results = results.filter(
          (m) => m.type?.toLowerCase() === filters.type?.toLowerCase()
        );
      }

      appCache.set(cacheKey, results, 300);
      return results;
    } catch (error) {
      console.error("[KomikuSource] Error searching:", error);
      return [];
    }
  }

  async getDetail(slug: string): Promise<MangaDetail> {
    const cleanId = this.cleanSlug(slug);
    const cacheKey = `komiku_detail_v3_${cleanId}`;
    const cached = appCache.get<MangaDetail>(cacheKey);
    if (cached) return cached;

    const targetUrl = `${this.baseUrl}/manga/${cleanId}/`;
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch manga detail for ${cleanId}: HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Title
    let rawTitle = $("h1").first().text();
    rawTitle = rawTitle.replace(/^Komik\s+/i, "").trim();

    // Cover extraction
    const imgEl = $(".ims img").length ? $(".ims img") : $(".inftable img");
    const rawCover =
      extractImageFromElement(imgEl) ||
      $('meta[property="og:image"]').attr("content") ||
      "";
    const coverUrl = normalizeImageUrl(rawCover);

    console.log({
      title: rawTitle || cleanId,
      extractedImage: coverUrl,
    });

    // Synopsis
    const synopsis =
      this.cleanText($(".desc").first().text()) ||
      this.cleanText($("#Judul .desc").text()) ||
      this.cleanText($('meta[property="og:description"]').attr("content")) ||
      "Tidak ada sinopsis tersedia.";

    // Metadata table extraction
    let alternativeTitle = "";
    let author = "";
    let status = "Ongoing";
    let type = "Manga";
    const genres: string[] = [];

    $(".inftable tr").each((_, el) => {
      const row = $(el);
      const key = this.cleanText(row.find("td").first().text()).toLowerCase();
      const val = this.cleanText(row.find("td").last().text());

      if (key.includes("alternatif")) {
        alternativeTitle = val;
      } else if (key.includes("pengarang") || key.includes("penulis") || key.includes("author")) {
        author = val;
      } else if (key.includes("status")) {
        status = val;
      } else if (key.includes("tipe") || key.includes("jenis")) {
        type = val;
      }
    });

    // Genres
    $(".genre a, ul.genre li a, .inftable .genre a").each((_, el) => {
      const g = this.cleanText($(el).text());
      if (g && !genres.includes(g)) genres.push(g);
    });

    // Chapters extraction via dedicated getChapters method
    const chapters = await this.getChapters(cleanId);

    const detail: MangaDetail = {
      id: cleanId,
      title: rawTitle || cleanId,
      alternativeTitle: alternativeTitle || undefined,
      cover: coverUrl,
      image: coverUrl,
      thumbnail: coverUrl,
      poster: coverUrl,
      banner: coverUrl,
      synopsis,
      author: author || undefined,
      status: status || "Ongoing",
      type: type || "Manga",
      genres,
      chapters,
      sourceId: this.id,
    };

    appCache.set(cacheKey, detail, 600); // 10 min cache
    return detail;
  }

  async getChapters(slug: string): Promise<Chapter[]> {
    const cleanId = this.cleanSlug(slug);
    const cacheKey = `komiku_chapters_v4_${cleanId}`;
    const cached = appCache.get<Chapter[]>(cacheKey);
    if (cached) return cached;

    try {
      const targetUrl = `${this.baseUrl}/manga/${cleanId}/`;
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) {
        return [];
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      const chapters: Chapter[] = [];
      $("#Daftar_Chapter tr, #daftarChapter tr, .daftar tr").each((_, el) => {
        const row = $(el);
        const link = row.find("a[itemprop='url'], a").first();
        const href = link.attr("href");
        if (!href || (!href.includes("chapter") && !href.includes("-ch-") && !href.includes("/ch/"))) return;

        const chId = this.cleanSlug(href);
        if (!chId) return;

        const rawTitle = this.cleanText(link.find("span[itemprop='name']").text() || link.text());
        const date = this.cleanText(row.find(".tanggalseries").text());

        // Normalize chapter number: e.g. "Chapter 01" -> "1", "Chapter 1050" -> "1050"
        const match =
          rawTitle.match(/(?:chapter|ch|ep|episode)[-_ ]*([\d.]+)/i) ||
          chId.match(/(?:chapter|ch)[-_ ]*([\d.]+)/i) ||
          chId.match(/[-_]([\d.]+)$/);

        const numVal = match ? parseFloat(match[1]) : parseFloat(rawTitle.replace(/[^\d.]/g, ""));
        const normalizedNumber = !isNaN(numVal) ? String(numVal) : undefined;
        const displayTitle = normalizedNumber
          ? (rawTitle.toLowerCase().includes("chapter") ? `Chapter ${normalizedNumber}` : rawTitle)
          : (rawTitle || chId);

        if (!chapters.some((c) => c.id === chId)) {
          chapters.push({
            id: chId,
            slug: chId,
            title: displayTitle,
            number: normalizedNumber,
            releaseDate: date || undefined,
          });
        }
      });

      // Sort Ascending: Chapter 1 ... Latest
      const sortedChapters = sortChapters(chapters, "asc");

      appCache.set(cacheKey, sortedChapters, 600);
      return sortedChapters;
    } catch (e: any) {
      console.error(`[KomikuSource.getChapters] Error:`, e.message);
      return [];
    }
  }

  async getChapterPages(chapterSlug: string): Promise<ChapterPages> {
    const cleanId = this.cleanSlug(chapterSlug);
    const cacheKey = `komiku_chapter_v3_${cleanId}`;
    const cached = appCache.get<ChapterPages>(cacheKey);
    if (cached) return cached;

    const targetUrl = `${this.baseUrl}/${cleanId}/`;
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch chapter ${cleanId}: HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Title
    const title = this.cleanText($("h1").first().text()) || cleanId;

    // Extract pages from #Baca_Komik
    const pages: string[] = [];
    $("#Baca_Komik img").each((_, el) => {
      const img = $(el);
      const rawSrc = extractImageFromElement(img);
      if (!rawSrc) return;

      // Filter ads & banners
      if (
        rawSrc.includes("promosi") ||
        rawSrc.includes("banner") ||
        rawSrc.includes("ads") ||
        rawSrc.includes("iklan") ||
        rawSrc.includes("google.svg") ||
        rawSrc.includes("gravatar") ||
        rawSrc.includes("/asset/img/")
      ) {
        return;
      }

      pages.push(normalizeImageUrl(rawSrc));
    });

    // Extract mangaId from links pointing to /manga/ or fallback to slug pattern
    let mangaId: string | undefined;
    $("a[href*='/manga/']").each((_, el) => {
      const href = $(el).attr("href");
      if (href && !mangaId) {
        const slug = this.cleanSlug(href);
        if (slug) mangaId = slug;
      }
    });

    if (!mangaId) {
      const derived = cleanId.replace(/-chapter-[\d.-]+.*$/i, "");
      if (derived && derived !== cleanId) {
        mangaId = derived;
      }
    }

    // Prev / Next Chapter links
    let prevChapterId: string | null = null;
    let nextChapterId: string | null = null;

    $("a").each((_, el) => {
      const a = $(el);
      const rel = (a.attr("rel") || "").toLowerCase();
      const href = a.attr("href");
      const ariaLabel = (a.attr("aria-label") || "").toLowerCase();
      const title = (a.attr("title") || "").toLowerCase();
      const className = (a.attr("class") || "").toLowerCase();
      const text = this.cleanText(a.text()).toLowerCase();
      const html = a.html() || "";

      if (href && href.includes("chapter")) {
        const slug = this.cleanSlug(href);
        if (slug && slug !== cleanId) {
          const isPrev =
            rel === "prev" ||
            ariaLabel.includes("prev") ||
            ariaLabel.includes("sebelum") ||
            title.includes("sebelum") ||
            className.includes("buttprev") ||
            className.includes("ch-prev") ||
            html.includes("fa-caret-left") ||
            text.includes("sebelum") ||
            text.includes("prev");

          const isNext =
            rel === "next" ||
            ariaLabel.includes("next") ||
            ariaLabel.includes("lanjut") ||
            ariaLabel.includes("berikut") ||
            title.includes("berikut") ||
            title.includes("lanjut") ||
            className.includes("buttnext") ||
            className.includes("ch-next") ||
            className.includes("next") ||
            html.includes("fa-caret-right") ||
            text.includes("lanjut") ||
            text.includes("next") ||
            text.includes("berikut");

          if (isPrev && !prevChapterId) {
            prevChapterId = slug;
          } else if (isNext && !nextChapterId) {
            nextChapterId = slug;
          }
        }
      }
    });

    // Validate and enforce numerical chapter order:
    // PREV must be older chapter (smaller number)
    // NEXT must be newer chapter (higher number)
    const getChNum = (slug: string): number | null => {
      const m = slug.match(/(?:chapter|ch)[-_]?([\d.]+)/i);
      return m && m[1] ? parseFloat(m[1]) : null;
    };

    const currentNum = getChNum(cleanId);
    if (prevChapterId && nextChapterId) {
      const pNum = getChNum(prevChapterId);
      const nNum = getChNum(nextChapterId);
      if (pNum !== null && nNum !== null && pNum > nNum) {
        // Swap to ensure prev is older, next is newer
        const temp = prevChapterId;
        prevChapterId = nextChapterId;
        nextChapterId = temp;
      }
    } else if (currentNum !== null) {
      if (prevChapterId && !nextChapterId) {
        const pNum = getChNum(prevChapterId);
        if (pNum !== null && pNum > currentNum) {
          nextChapterId = prevChapterId;
          prevChapterId = null;
        }
      } else if (nextChapterId && !prevChapterId) {
        const nNum = getChNum(nextChapterId);
        if (nNum !== null && nNum < currentNum) {
          prevChapterId = nextChapterId;
          nextChapterId = null;
        }
      }
    }

    if (mangaId) {
      try {
        const allChapters = await this.getChapters(mangaId);
        const currIdx = allChapters.findIndex((c) => c.id === cleanId || c.slug === cleanId);
        if (currIdx !== -1) {
          if (currIdx > 0) {
            prevChapterId = allChapters[currIdx - 1].id;
          } else {
            prevChapterId = null;
          }
          if (currIdx < allChapters.length - 1) {
            nextChapterId = allChapters[currIdx + 1].id;
          } else {
            nextChapterId = null;
          }
        }
      } catch (err) {
        console.warn(`[KomikuSource.getChapterPages] Could not resolve chapters list:`, err);
      }
    }

    const chapterData: ChapterPages = {
      chapterId: cleanId,
      mangaId,
      title,
      pages,
      prevChapterId,
      nextChapterId,
      sourceId: this.id,
    };

    appCache.set(cacheKey, chapterData, 900); // 15 min cache
    return chapterData;
  }
}
