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

export class KomikcastSource implements MangaSource {
  readonly id = "komikcast";
  readonly name = "Komikcast Indonesia";
  readonly baseUrl = "https://komikcast.bz";
  readonly apiBaseUrl = "https://api.voratoon.com";

  private cleanSlug(urlOrSlug: string): string {
    if (!urlOrSlug) return "";
    return urlOrSlug
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/series\//i, "")
      .replace(/^\/manga\//i, "")
      .replace(/^\//, "")
      .replace(/\/$/, "")
      .trim();
  }

  private cleanText(text: string | null | undefined): string {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractGenres(rawGenres: any): string[] {
    if (!rawGenres) return [];
    if (Array.isArray(rawGenres)) {
      return rawGenres
        .map((g: any) => {
          if (typeof g === "string") return g.trim();
          if (g && typeof g === "object") {
            if (g.data && typeof g.data.name === "string") return g.data.name.trim();
            if (typeof g.name === "string") return g.name.trim();
            if (typeof g.title === "string") return g.title.trim();
          }
          return "";
        })
        .filter((g): g is string => Boolean(g));
    }
    if (typeof rawGenres === "string") {
      return rawGenres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
    }
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapItem(item: any): MangaItem {
    const d = item?.data || item || {};
    const rawSlug = d.slug || item?.slug || String(item?.id || "");
    const slug = this.cleanSlug(rawSlug);
    const cover = d.coverImage || item?.coverImage || d.cover || item?.cover || "";
    const synopsis = d.synopsis ? this.cleanText(d.synopsis) : "";

    let format = "Manga";
    if (d.format) {
      const f = String(d.format).toLowerCase();
      if (f.includes("manhwa") || f.includes("mangatoon")) format = "Manhwa";
      else if (f.includes("manhua")) format = "Manhua";
      else if (f.includes("manga")) format = "Manga";
    }

    const genres = this.extractGenres(d.genres);

    return {
      id: slug,
      slug: slug,
      title: this.cleanText(d.title || item?.title) || slug,
      cover,
      thumbnail: cover,
      image: cover,
      poster: cover,
      banner: d.backgroundImage || cover,
      description: synopsis,
      synopsis: synopsis,
      type: format,
      genres,
      latestChapter: d.totalChapters ? `Chapter ${d.totalChapters}` : undefined,
      rating: d.rating ? String(d.rating) : undefined,
      status: d.status === "completed" ? "Completed" : "Ongoing",
      updatedAt: item?.updatedAt || item?.createdAt,
      sourceId: this.id,
    };
  }

  async getHome(): Promise<HomeData> {
    const cacheKey = "komikcast_home_v2";
    const cached = appCache.get<HomeData>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.apiBaseUrl}/series?includeMeta=true&take=24&page=1`, {
        next: { revalidate: 1800 },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Komikcast API error: ${res.status}`);
      const json = await res.json();
      const items: MangaItem[] = Array.isArray(json.data)
        ? json.data.map((item: any) => this.mapItem(item))
        : [];

      const homeData: HomeData = {
        featured: items.slice(0, 6),
        popular: items.slice(6, 12),
        latest: items.slice(12, 18),
        recommendations: items.slice(18, 24),
      };

      appCache.set(cacheKey, homeData, 1800);
      return homeData;
    } catch (err) {
      console.error("[KomikcastSource] getHome error:", err);
      return {
        featured: [],
        popular: [],
        latest: [],
        recommendations: [],
      };
    }
  }

  async getPopular(page = 1): Promise<MangaItem[]> {
    try {
      const res = await fetch(
        `${this.apiBaseUrl}/series?includeMeta=true&take=20&page=${page}&orderBy=views`,
        {
          next: { revalidate: 3600 },
          headers: { Accept: "application/json" },
        }
      );
      if (!res.ok) throw new Error(`Komikcast API error: ${res.status}`);
      const json = await res.json();
      return Array.isArray(json.data)
        ? json.data.map((item: any) => this.mapItem(item))
        : [];
    } catch (err) {
      console.error("[KomikcastSource] getPopular error:", err);
      return [];
    }
  }

  async getLatest(page = 1): Promise<MangaItem[]> {
    try {
      const res = await fetch(
        `${this.apiBaseUrl}/series?includeMeta=true&take=20&page=${page}`,
        {
          next: { revalidate: 600 },
          headers: { Accept: "application/json" },
        }
      );
      if (!res.ok) throw new Error(`Komikcast API error: ${res.status}`);
      const json = await res.json();
      return Array.isArray(json.data)
        ? json.data.map((item: any) => this.mapItem(item))
        : [];
    } catch (err) {
      console.error("[KomikcastSource] getLatest error:", err);
      return [];
    }
  }

  /**
   * Search Komikcast series with query string or filters object.
   */
  async search(queryOrFilters: string | SearchFilters): Promise<MangaItem[]> {
    try {
      let query = "";
      let page = 1;

      if (typeof queryOrFilters === "string") {
        query = queryOrFilters;
      } else if (queryOrFilters && typeof queryOrFilters === "object") {
        query = queryOrFilters.query || "";
        page = queryOrFilters.page || 1;
      }

      const queryParam = query.trim() ? `&title=${encodeURIComponent(query.trim())}` : "";
      const res = await fetch(
        `${this.apiBaseUrl}/series?includeMeta=true&take=30&page=${page}${queryParam}`,
        {
          headers: { Accept: "application/json" },
        }
      );
      if (!res.ok) throw new Error(`Komikcast API search error: ${res.status}`);
      const json = await res.json();
      return Array.isArray(json.data)
        ? json.data.map((item: any) => this.mapItem(item))
        : [];
    } catch (err) {
      console.error("[KomikcastSource] search error:", err);
      return [];
    }
  }

  /**
   * Fetches full chapter list for a given series slug.
   */
  async getChapters(slug: string): Promise<Chapter[]> {
    const cleanSlug = this.cleanSlug(slug);
    const cacheKey = `komikcast_chapters_v4_${cleanSlug}`;
    const cached = appCache.get<Chapter[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.apiBaseUrl}/series/${cleanSlug}/chapters`, {
        next: { revalidate: 600 },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Komikcast chapters error: ${res.status}`);
      const json = await res.json();

      let allRawData: any[] = [];
      if (Array.isArray(json.data)) {
        allRawData = json.data;
      }

      // Check pagination metadata if available
      const totalPages =
        json.meta?.totalPages ||
        json.meta?.total_pages ||
        json.pagination?.totalPages ||
        json.total_pages;

      if (typeof totalPages === "number" && totalPages > 1) {
        for (let p = 2; p <= totalPages; p++) {
          try {
            const pRes = await fetch(
              `${this.apiBaseUrl}/series/${cleanSlug}/chapters?page=${p}`,
              {
                next: { revalidate: 600 },
                headers: { Accept: "application/json" },
              }
            );
            if (pRes.ok) {
              const pJson = await pRes.json();
              if (Array.isArray(pJson.data)) {
                allRawData.push(...pJson.data);
              }
            }
          } catch (pErr) {
            console.warn(`[KomikcastSource] Error fetching page ${p} for ${cleanSlug}:`, pErr);
          }
        }
      }

      const chapters: Chapter[] = allRawData
        .filter((ch: any) => ch && ch.data && ch.data.index !== undefined)
        .map((ch: any) => {
          const rawIdx = ch.data.index;
          const numVal = parseFloat(String(rawIdx));
          const normalizedNumber = !isNaN(numVal) ? String(numVal) : String(rawIdx);
          const chTitle = ch.data.title
            ? `Chapter ${normalizedNumber}: ${ch.data.title}`
            : `Chapter ${normalizedNumber}`;

          return {
            id: `${cleanSlug}-chapter-${normalizedNumber}`,
            slug: `${cleanSlug}-chapter-${normalizedNumber}`,
            title: chTitle,
            number: normalizedNumber,
            releaseDate: ch.createdAt
              ? new Date(ch.createdAt).toLocaleDateString("id-ID")
              : undefined,
          };
        });

      const sortedChapters = sortChapters(chapters, "asc");

      appCache.set(cacheKey, sortedChapters, 600);
      return sortedChapters;
    } catch (err) {
      console.error("[KomikcastSource] getChapters error:", err);
      return [];
    }
  }

  /**
   * Normalized manga detail retrieval.
   */
  async getDetail(slug: string): Promise<MangaDetail> {
    const cleanSlug = this.cleanSlug(slug);
    const cacheKey = `komikcast_detail_${cleanSlug}`;
    const cached = appCache.get<MangaDetail>(cacheKey);
    if (cached) return cached;

    const [detailRes, chapters] = await Promise.all([
      fetch(`${this.apiBaseUrl}/series/${cleanSlug}`, {
        next: { revalidate: 1800 },
        headers: { Accept: "application/json" },
      }),
      this.getChapters(cleanSlug),
    ]);

    if (!detailRes.ok) {
      throw new Error(`Gagal memuat detail komik Komikcast: ${detailRes.status}`);
    }

    const detailJson = await detailRes.json();
    const d = detailJson.data?.data || detailJson.data || {};

    const cover = d.coverImage || d.cover || "";
    const synopsis = d.synopsis ? this.cleanText(d.synopsis) : "Tidak ada sinopsis.";

    let format = "Manga";
    if (d.format) {
      const f = String(d.format).toLowerCase();
      if (f.includes("manhwa") || f.includes("mangatoon")) format = "Manhwa";
      else if (f.includes("manhua")) format = "Manhua";
    }

    const genres = this.extractGenres(d.genres);

    const mangaDetail: MangaDetail = {
      id: d.slug || cleanSlug,
      slug: d.slug || cleanSlug,
      title: this.cleanText(d.title) || cleanSlug,
      alternativeTitle: d.nativeTitle || undefined,
      cover,
      image: cover,
      thumbnail: cover,
      poster: cover,
      banner: d.backgroundImage || cover,
      bannerImage: d.backgroundImage || cover,
      description: synopsis,
      synopsis: synopsis,
      author: d.author || undefined,
      status: d.status === "completed" ? "Completed" : "Ongoing",
      type: format,
      genres,
      chapters,
      sourceId: this.id,
    };

    appCache.set(cacheKey, mangaDetail, 1800);
    return mangaDetail;
  }

  async getMangaDetail(slug: string): Promise<MangaDetail> {
    return this.getDetail(slug);
  }

  /**
   * Chapter pages reader handler.
   */
  async getChapterPages(chapterSlug: string): Promise<ChapterPages> {
    const cacheKey = `komikcast_ch_${chapterSlug}`;
    const cached = appCache.get<ChapterPages>(cacheKey);
    if (cached) return cached;

    // Parse mangaSlug and chapterIndex from chapterSlug:
    // e.g. "the-return-of-the-scorned-genius-chapter-4" -> manga: "the-return-of-the-scorned-genius", idx: "4"
    let mangaSlug = "";
    let chapterIndex = "";

    const match =
      chapterSlug.match(/^(.*?)[-_]chapter[-_]([\d.]+)$/i) ||
      chapterSlug.match(/^(.*?)[-_]ch[-_]([\d.]+)$/i);

    if (match) {
      mangaSlug = this.cleanSlug(match[1]);
      chapterIndex = match[2];
    } else {
      const lastHyphen = chapterSlug.lastIndexOf("-");
      if (lastHyphen !== -1) {
        mangaSlug = this.cleanSlug(chapterSlug.substring(0, lastHyphen));
        chapterIndex = chapterSlug.substring(lastHyphen + 1);
      } else {
        mangaSlug = this.cleanSlug(chapterSlug);
        chapterIndex = "1";
      }
    }

    const res = await fetch(
      `${this.apiBaseUrl}/series/${mangaSlug}/chapters/${chapterIndex}`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (!res.ok) {
      throw new Error(`Gagal mengambil halaman chapter Komikcast (${res.status})`);
    }

    const json = await res.json();
    let pages: string[] = [];
    const rawImages = json.data?.data?.images || json.data?.images;

    if (Array.isArray(rawImages)) {
      pages = rawImages.filter(
        (img): img is string => typeof img === "string" && img.trim().length > 0
      );
    } else if (typeof rawImages === "string") {
      pages = rawImages
        .split(/\s+/)
        .map((u) => u.trim())
        .filter((u) => u.length > 0 && u.startsWith("http"));
    }

    // Determine exact prev and next chapter IDs
    let prevChapterId: string | null = null;
    let nextChapterId: string | null = null;

    try {
      const chapters = await this.getChapters(mangaSlug);
      if (chapters.length > 0) {
        // Chapters are sorted descending: [Ch 4 (idx 0), Ch 3 (idx 1), Ch 2 (idx 2), Ch 1 (idx 3)]
        const currIdx = chapters.findIndex(
          (c) =>
            c.number === String(chapterIndex) ||
            c.id === chapterSlug ||
            parseFloat(c.number || "0") === parseFloat(chapterIndex)
        );

        if (currIdx !== -1) {
          // In ascending order: [Ch 1 (idx 0), Ch 2 (idx 1), Ch 3 (idx 2)]
          // Older chapter (prev, lower number) is at currIdx - 1
          if (currIdx > 0) {
            prevChapterId = chapters[currIdx - 1].id;
          }
          // Newer chapter (next, higher number) is at currIdx + 1
          if (currIdx < chapters.length - 1) {
            nextChapterId = chapters[currIdx + 1].id;
          }
        }
      }
    } catch {
      // Fallback calculation
      const num = parseFloat(chapterIndex);
      if (num > 1) prevChapterId = `${mangaSlug}-chapter-${num - 1}`;
      nextChapterId = `${mangaSlug}-chapter-${num + 1}`;
    }

    const result: ChapterPages = {
      chapterId: chapterSlug,
      mangaId: mangaSlug,
      title: `Chapter ${chapterIndex}`,
      pages,
      prevChapterId,
      nextChapterId,
      sourceId: this.id,
    };

    appCache.set(cacheKey, result, 3600);
    return result;
  }
}
