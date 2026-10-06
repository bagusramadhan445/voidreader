import * as cheerio from "cheerio";
import { appCache } from "../cache";
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

export class WebtoonSource implements MangaSource {
  readonly id = "webtoon";
  readonly name = "Webtoon Indonesia";
  readonly baseUrl = "https://www.webtoons.com/id";

  private headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://www.webtoons.com/id/",
  };

  /**
   * Encodes a webtoon image URL through the local image proxy with appropriate Referer.
   */
  private proxyImage(imgUrl: string | null | undefined): string {
    if (!imgUrl) return "/placeholder.jpg";
    const trimmed = imgUrl.trim();
    if (!trimmed || trimmed.startsWith("/placeholder")) return "/placeholder.jpg";
    return `/api/proxy/image?url=${encodeURIComponent(trimmed)}`;
  }

  /**
   * Normalizes manga slug format: webtoon--{genre}--{titleSlug}--{titleNo}
   */
  private parseMangaSlug(slug: string): { genre: string; titleSlug: string; titleNo: string } {
    const clean = slug.replace(/^webtoon--/, "");
    const parts = clean.split("--");
    if (parts.length >= 3) {
      const genre = parts[0];
      const titleNo = parts[parts.length - 1];
      const titleSlug = parts.slice(1, parts.length - 1).join("--");
      return { genre, titleSlug, titleNo };
    }
    return { genre: "action", titleSlug: clean, titleNo: clean };
  }

  /**
   * Normalizes chapter slug format: webtoon--{genre}--{titleSlug}--{titleNo}--{epSlug}--{episodeNo}
   */
  private parseChapterSlug(chapterSlug: string): {
    genre: string;
    titleSlug: string;
    titleNo: string;
    epSlug: string;
    episodeNo: string;
    mangaId: string;
  } {
    const clean = chapterSlug.replace(/^webtoon--/, "");
    const parts = clean.split("--");
    if (parts.length >= 5) {
      const genre = parts[0];
      const titleNo = parts[parts.length - 3];
      const epSlug = parts[parts.length - 2];
      const episodeNo = parts[parts.length - 1];
      const titleSlug = parts.slice(1, parts.length - 3).join("--");
      const mangaId = `webtoon--${genre}--${titleSlug}--${titleNo}`;
      return { genre, titleSlug, titleNo, epSlug, episodeNo, mangaId };
    }

    return {
      genre: "action",
      titleSlug: "manga",
      titleNo: "0",
      epSlug: clean,
      episodeNo: "1",
      mangaId: "webtoon--action--manga--0",
    };
  }

  /**
   * Converts a LINE Webtoon title URL to our isolated manga slug
   */
  private urlToMangaSlug(url: string): string {
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

  /**
   * Converts a LINE Webtoon episode URL to our isolated chapter slug
   */
  private urlToChapterSlug(
    url: string,
    defaultGenre = "action",
    defaultTitleSlug = "manga",
    defaultTitleNo = "0"
  ): string {
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://www.webtoons.com${url}`);
      const titleNo = parsed.searchParams.get("title_no") || defaultTitleNo;
      const episodeNo = parsed.searchParams.get("episode_no") || "1";
      const pathParts = parsed.pathname.replace(/^\/id\//, "").split("/").filter(Boolean);
      const genre = pathParts[0] || defaultGenre;
      const titleSlug = pathParts[1] || defaultTitleSlug;
      const epSlug = pathParts[2] || `ep-${episodeNo}`;
      return `webtoon--${genre}--${titleSlug}--${titleNo}--${epSlug}--${episodeNo}`;
    } catch {
      return `webtoon--${defaultGenre}--${defaultTitleSlug}--${defaultTitleNo}--ep--1`;
    }
  }

  /**
   * Searches LINE Webtoon Indonesia
   */
  async search(filters: SearchFilters | string): Promise<MangaItem[]> {
    const query = typeof filters === "string" ? filters : filters.query || "";
    if (!query.trim()) {
      return this.getPopular();
    }

    const cacheKey = `webtoon_search_${query.trim().toLowerCase()}`;
    const cached = appCache.get<MangaItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query.trim())}`;
      const res = await fetch(url, {
        headers: this.headers,
        next: { revalidate: 600 },
      });
      if (!res.ok) throw new Error(`Webtoon search HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      const items: MangaItem[] = [];
      $("ul.webtoon_list li, .webtoon_list_wrap li").each((_, el) => {
        const $li = $(el);
        const link = $li.find("a").attr("href");
        if (!link || !link.includes("title_no=")) return;

        const title = $li.find(".title, .subj, strong").first().text().trim();
        if (!title) return;

        const rawImg = $li.find("img").attr("src");
        const cover = this.proxyImage(rawImg);
        const author = $li.find(".author").text().trim();
        const genre = $li.find(".genre").text().trim();
        const mangaId = this.urlToMangaSlug(link);

        items.push({
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
          genres: genre ? [genre] : ["Webtoon"],
          status: "Ongoing",
          sourceId: this.id,
        });
      });

      appCache.set(cacheKey, items, 600);
      return items;
    } catch (err) {
      console.error("[WebtoonSource] search error:", err);
      return [];
    }
  }

  /**
   * Retrieves popular ranking webtoons
   */
  async getPopular(page = 1): Promise<MangaItem[]> {
    const cacheKey = `webtoon_popular_v1_${page}`;
    const cached = appCache.get<MangaItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.baseUrl}/ranking`, {
        headers: this.headers,
        next: { revalidate: 1800 },
      });
      if (!res.ok) throw new Error(`Webtoon ranking HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      const items: MangaItem[] = [];
      $('a[href*="title_no"]').each((_, el) => {
        const href = $(el).attr("href");
        if (!href || !href.includes("title_no=")) return;

        const mangaId = this.urlToMangaSlug(href);
        if (items.some((x) => x.id === mangaId)) return;

        const title =
          $(el).find(".title").first().text().trim() ||
          $(el).find("img").attr("alt") ||
          $(el).find(".subj").first().text().trim() ||
          $(el).text().replace(/\s+/g, " ").trim();
        if (!title) return;

        const rawImg = $(el).find("img").attr("src");
        const cover = this.proxyImage(rawImg);
        const author = $(el).find(".author").text().trim();

        items.push({
          id: mangaId,
          slug: mangaId,
          title: title.replace(/^["'\d\s]+|^\w+\s+["'\d\s]+/i, "").trim() || title,
          cover,
          thumbnail: cover,
          image: cover,
          poster: cover,
          banner: cover,
          type: "Webtoon",
          author: author || undefined,
          genres: ["Webtoon"],
          status: "Ongoing",
          sourceId: this.id,
        });
      });

      appCache.set(cacheKey, items, 1800);
      return items;
    } catch (err) {
      console.error("[WebtoonSource] getPopular error:", err);
      return [];
    }
  }

  /**
   * Retrieves latest original webtoons
   */
  async getLatest(page = 1): Promise<MangaItem[]> {
    const cacheKey = `webtoon_latest_v1_${page}`;
    const cached = appCache.get<MangaItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.baseUrl}/originals`, {
        headers: this.headers,
        next: { revalidate: 900 },
      });
      if (!res.ok) throw new Error(`Webtoon originals HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      const items: MangaItem[] = [];
      $('a[href*="title_no"]').each((_, el) => {
        const href = $(el).attr("href");
        if (!href || !href.includes("title_no=")) return;

        const mangaId = this.urlToMangaSlug(href);
        if (items.some((x) => x.id === mangaId)) return;

        const title =
          $(el).find(".title").first().text().trim() ||
          $(el).find("img").attr("alt") ||
          $(el).find(".subj").first().text().trim() ||
          $(el).text().replace(/\s+/g, " ").trim();
        if (!title) return;

        const rawImg = $(el).find("img").attr("src");
        const cover = this.proxyImage(rawImg);
        const author = $(el).find(".author").text().trim();

        items.push({
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
          genres: ["Webtoon"],
          status: "Ongoing",
          sourceId: this.id,
        });
      });

      appCache.set(cacheKey, items, 900);
      return items;
    } catch (err) {
      console.error("[WebtoonSource] getLatest error:", err);
      return [];
    }
  }

  /**
   * Returns formatted HomeData for Webtoon Indonesia
   */
  async getHome(): Promise<HomeData> {
    const cacheKey = "webtoon_home_v1";
    const cached = appCache.get<HomeData>(cacheKey);
    if (cached) return cached;

    try {
      const [popular, latest] = await Promise.all([this.getPopular(1), this.getLatest(1)]);

      const homeData: HomeData = {
        featured: popular.slice(0, 6),
        popular: popular.slice(6, 16),
        latest: latest.slice(0, 20),
        recommendations: popular.slice(16, 26),
      };

      appCache.set(cacheKey, homeData, 1800);
      return homeData;
    } catch (err) {
      console.error("[WebtoonSource] getHome error:", err);
      return {
        featured: [],
        popular: [],
        latest: [],
        recommendations: [],
      };
    }
  }

  /**
   * Fetches manga detail and episode list
   */
  /**
   * Fetches the complete list of chapters across all pages for a Webtoon
   */
  private async fetchAllChapters(slug: string, initialHtml?: string): Promise<Chapter[]> {
    const chaptersCacheKey = `webtoon_full_chapters_v4_${slug}`;
    const cachedChapters = appCache.get<Chapter[]>(chaptersCacheKey);
    if (cachedChapters && cachedChapters.length > 0) return cachedChapters;

    const { genre, titleSlug, titleNo } = this.parseMangaSlug(slug);

    const parsePageEpisodes = ($: cheerio.CheerioAPI): Chapter[] => {
      const list: Chapter[] = [];
      $("ul#_listUl li, .detail_list li, ul._episodeList li").each((_, el) => {
        const $li = $(el);
        const epLink = $li.find("a").attr("href");
        if (!epLink || !epLink.includes("viewer")) return;

        const epTitle =
          $li.find(".subj span, .subj").first().text().trim() ||
          $li.find("img").attr("alt") ||
          "Episode";
        const epDate = $li.find(".date").first().text().trim();
        const epChapterId = this.urlToChapterSlug(epLink, genre, titleSlug, titleNo);
        const match = epLink.match(/episode_no=(\d+)/);
        const rawEpisodeNo = match ? match[1] : epChapterId.split("--").pop() || "0";
        const parsedEpNo = parseFloat(rawEpisodeNo);
        const normalizedEpNo = !isNaN(parsedEpNo) ? String(parsedEpNo) : rawEpisodeNo;

        list.push({
          id: epChapterId,
          slug: epChapterId,
          title: epTitle,
          number: normalizedEpNo,
          releaseDate: epDate || undefined,
        });
      });
      return list;
    };

    try {
      let page1Html = initialHtml;
      let canonicalListUrl = `${this.baseUrl}/${genre}/${titleSlug}/list?title_no=${titleNo}`;

      if (!page1Html) {
        const page1Url = `${canonicalListUrl}&page=1`;
        const res = await fetch(page1Url, {
          headers: this.headers,
          next: { revalidate: 600 },
        });
        if (!res.ok) return [];
        page1Html = await res.text();
        if (res.url) {
          try {
            const u = new URL(res.url);
            u.searchParams.delete("page");
            canonicalListUrl = u.toString();
          } catch {}
        }
      }

      const $1 = cheerio.load(page1Html);
      const canonicalTag = $1('link[rel="canonical"]').attr("href");
      if (canonicalTag) {
        try {
          const u = new URL(canonicalTag.startsWith("http") ? canonicalTag : `https://www.webtoons.com${canonicalTag}`);
          u.searchParams.delete("page");
          canonicalListUrl = u.toString();
        } catch {}
      }

      const page1Episodes = parsePageEpisodes($1);
      if (page1Episodes.length === 0) return [];

      const latestEpNo = parseInt(page1Episodes[0].number || "10", 10) || 10;
      const totalPages = Math.ceil(latestEpNo / 10);

      const allEpisodesMap = new Map<string, Chapter>();
      page1Episodes.forEach((ep) => allEpisodesMap.set(ep.id, ep));

      // Fetch remaining pages concurrently in chunks of 10
      if (totalPages > 1) {
        const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const chunkSize = 10;
        const separator = canonicalListUrl.includes("?") ? "&" : "?";

        for (let i = 0; i < remainingPages.length; i += chunkSize) {
          const chunk = remainingPages.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async (p) => {
              try {
                const pUrl = `${canonicalListUrl}${separator}page=${p}`;
                const pRes = await fetch(pUrl, {
                  headers: this.headers,
                  next: { revalidate: 1800 },
                });
                if (!pRes.ok) return;
                const pHtml = await pRes.text();
                const $p = cheerio.load(pHtml);
                const pEpisodes = parsePageEpisodes($p);
                pEpisodes.forEach((ep) => allEpisodesMap.set(ep.id, ep));
              } catch (e) {
                console.warn(`[WebtoonSource] Error loading page ${p} for ${slug}:`, e);
              }
            })
          );
        }
      }

      // Sort Ascending: Chapter 1 ... Latest Chapter
      const sortedChapters = sortChapters(Array.from(allEpisodesMap.values()), "asc");

      appCache.set(chaptersCacheKey, sortedChapters, 1800);
      return sortedChapters;
    } catch (err) {
      console.error(`[WebtoonSource] fetchAllChapters error for ${slug}:`, err);
      return [];
    }
  }

  /**
   * Fetches manga detail and complete episode list
   */
  async getDetail(slug: string): Promise<MangaDetail> {
    const cacheKey = `webtoon_detail_full_v2_${slug}`;
    const cached = appCache.get<MangaDetail>(cacheKey);
    if (cached) return cached;

    const { genre, titleSlug, titleNo } = this.parseMangaSlug(slug);
    const detailUrl = `${this.baseUrl}/${genre}/${titleSlug}/list?title_no=${titleNo}`;

    try {
      const res = await fetch(detailUrl, {
        headers: this.headers,
        next: { revalidate: 600 },
      });
      if (!res.ok) throw new Error(`Webtoon detail HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      const title =
        $(".detail_header .subj, .subj, h1.subj").first().text().trim() ||
        titleSlug.replace(/-/g, " ");
      const author = $(".author, .author_area").first().text().replace(/\s+/g, " ").trim();
      const synopsis = $(".summary, .desc").first().text().trim();
      const rawGenre = $(".genre").first().text().trim();

      const rawCover =
        $('meta[property="og:image"]').attr("content") ||
        $(".detail_header img, .thmb img, .poster img").attr("src");
      const cover = this.proxyImage(rawCover);

      // Load all available chapters across all pages
      const chapters = await this.fetchAllChapters(slug, html);

      const mangaDetail: MangaDetail = {
        id: slug,
        slug,
        title,
        cover,
        thumbnail: cover,
        image: cover,
        poster: cover,
        banner: cover,
        bannerImage: cover,
        synopsis: synopsis || "Baca komik Webtoon Indonesia resmi terlengkap di Void Reader.",
        author: author || undefined,
        status: "Ongoing",
        type: "Webtoon",
        genres: rawGenre ? [rawGenre, "Webtoon"] : ["Webtoon"],
        chapters,
        sourceId: this.id,
      };

      appCache.set(cacheKey, mangaDetail, 600);
      return mangaDetail;
    } catch (err) {
      console.error(`[WebtoonSource] getDetail error for ${slug}:`, err);
      return {
        id: slug,
        slug,
        title: titleSlug.replace(/-/g, " "),
        cover: "/placeholder.jpg",
        thumbnail: "/placeholder.jpg",
        synopsis: "Informasi detail webtoon tidak tersedia.",
        status: "Ongoing",
        type: "Webtoon",
        genres: ["Webtoon"],
        chapters: [],
        sourceId: this.id,
      };
    }
  }

  /**
   * Alias for getDetail
   */
  async getMangaDetail(slug: string): Promise<MangaDetail> {
    return this.getDetail(slug);
  }

  /**
   * Returns complete episode chapters list for a manga
   */
  async getChapters(slug: string): Promise<Chapter[]> {
    return this.fetchAllChapters(slug);
  }

  /**
   * Fetches reader images and prev/next links for a specific episode
   */
  async getChapterPages(chapterSlug: string): Promise<ChapterPages> {
    const cacheKey = `webtoon_pages_${chapterSlug}`;
    const cached = appCache.get<ChapterPages>(cacheKey);
    if (cached) return cached;

    const { genre, titleSlug, titleNo, epSlug, episodeNo, mangaId } =
      this.parseChapterSlug(chapterSlug);
    const viewerUrl = `${this.baseUrl}/${genre}/${titleSlug}/${epSlug}/viewer?title_no=${titleNo}&episode_no=${episodeNo}`;

    try {
      const res = await fetch(viewerUrl, {
        headers: this.headers,
        next: { revalidate: 3600 },
      });
      if (!res.ok) throw new Error(`Webtoon viewer HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      const title =
        $(".subj_episode, .subj").first().text().trim() ||
        `Episode ${episodeNo}`;

      // Extract all episode images
      const rawPages: string[] = [];
      $("#_imageList img, .viewer_img img, .viewer_lst img").each((_, el) => {
        const src = $(el).attr("data-url") || $(el).attr("src");
        if (
          src &&
          !src.includes("bg_trans") &&
          !src.includes("btn_") &&
          !src.includes("thumb") &&
          (src.includes("pstatic.net") || src.includes("webtoon"))
        ) {
          rawPages.push(src);
        }
      });

      // Filter duplicates
      const uniquePages = Array.from(new Set(rawPages)).map((url) => this.proxyImage(url));

      // Resolve Prev Episode link
      const prevHref = $("a.pg_prev, a._prevEpisode").attr("href");
      let prevChapterId: string | null = null;
      if (prevHref && prevHref !== "#" && prevHref.includes("viewer")) {
        prevChapterId = this.urlToChapterSlug(prevHref, genre, titleSlug, titleNo);
      }

      // Resolve Next Episode link
      const nextHref = $("a.pg_next, a._nextEpisode").attr("href");
      let nextChapterId: string | null = null;
      if (nextHref && nextHref !== "#" && nextHref.includes("viewer")) {
        nextChapterId = this.urlToChapterSlug(nextHref, genre, titleSlug, titleNo);
      }

      // Fallback if prev or next is missing and mangaId is available
      if ((!prevChapterId || !nextChapterId) && mangaId) {
        try {
          const chapters = await this.getChapters(mangaId);
          const currIdx = chapters.findIndex(
            (c) => c.id === chapterSlug || c.slug === chapterSlug || c.number === String(episodeNo)
          );
          if (currIdx !== -1) {
            if (!prevChapterId && currIdx > 0) {
              prevChapterId = chapters[currIdx - 1].id;
            }
            if (!nextChapterId && currIdx < chapters.length - 1) {
              nextChapterId = chapters[currIdx + 1].id;
            }
          }
        } catch {}
      }

      const chapterPages: ChapterPages = {
        chapterId: chapterSlug,
        mangaId,
        title,
        pages: uniquePages,
        prevChapterId,
        nextChapterId,
        sourceId: this.id,
      };

      appCache.set(cacheKey, chapterPages, 3600);
      return chapterPages;
    } catch (err) {
      console.error(`[WebtoonSource] getChapterPages error for ${chapterSlug}:`, err);
      return {
        chapterId: chapterSlug,
        mangaId,
        title: `Episode ${episodeNo}`,
        pages: [],
        prevChapterId: null,
        nextChapterId: null,
        sourceId: this.id,
      };
    }
  }
}
