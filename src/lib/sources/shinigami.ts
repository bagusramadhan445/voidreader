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

export class ShinigamiSource implements MangaSource {
  readonly id = "shinigami";
  readonly name = "Shinigami Indonesia";
  readonly baseUrl = "https://shinigami.moe";
  readonly apiBaseUrl = "https://api.shngm.io";

  private cleanText(text: string | null | undefined): string {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapItem(item: any): MangaItem {
    const mangaId = item.manga_id || String(item.id);
    const cover = item.cover_portrait_url || item.cover_image_url || "";

    let format = "Manga";
    if (item.taxonomy?.Format?.name) {
      format = item.taxonomy.Format.name;
    } else if (item.country_id === "KR") {
      format = "Manhwa";
    } else if (item.country_id === "CN") {
      format = "Manhua";
    }

    let genres: string[] = [];
    if (Array.isArray(item.taxonomy?.Genre)) {
      genres = item.taxonomy.Genre.map((g: any) => g.name || g.slug || String(g));
    }

    return {
      id: mangaId,
      slug: mangaId,
      title: this.cleanText(item.title) || mangaId,
      cover,
      image: cover,
      thumbnail: cover,
      poster: cover,
      banner: item.cover_image_url || cover,
      type: format,
      latestChapter: item.latest_chapter_number ? `Chapter ${item.latest_chapter_number}` : undefined,
      rating: item.user_rate ? String(item.user_rate) : undefined,
      genres,
      status: item.status === 1 ? "Ongoing" : "Completed",
      updatedAt: item.updated_at || item.created_at,
      synopsis: item.description ? this.cleanText(item.description) : undefined,
      sourceId: this.id,
    };
  }

  async getHome(): Promise<HomeData> {
    const cacheKey = "shinigami_home_v1";
    const cached = appCache.get<HomeData>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${this.apiBaseUrl}/v1/manga/list?page=1&page_size=24`, {
        next: { revalidate: 1800 },
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`Shinigami API error: ${res.status}`);
      const json = await res.json();
      const items: MangaItem[] = Array.isArray(json.data) ? json.data.map((item: any) => this.mapItem(item)) : [];

      const homeData: HomeData = {
        featured: items.slice(0, 6),
        popular: items.slice(6, 12),
        latest: items.slice(12, 18),
        recommendations: items.slice(18, 24),
      };

      appCache.set(cacheKey, homeData, 1800);
      return homeData;
    } catch (err) {
      console.error("[ShinigamiSource] getHome error:", err);
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
      const res = await fetch(`${this.apiBaseUrl}/v1/manga/list?page=${page}&page_size=20&sort=view_count`, {
        next: { revalidate: 3600 },
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`Shinigami API error: ${res.status}`);
      const json = await res.json();
      return Array.isArray(json.data) ? json.data.map((item: any) => this.mapItem(item)) : [];
    } catch (err) {
      console.error("[ShinigamiSource] getPopular error:", err);
      return [];
    }
  }

  async getLatest(page = 1): Promise<MangaItem[]> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/v1/manga/list?page=${page}&page_size=20&sort=latest_chapter_time`, {
        next: { revalidate: 600 },
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`Shinigami API error: ${res.status}`);
      const json = await res.json();
      return Array.isArray(json.data) ? json.data.map((item: any) => this.mapItem(item)) : [];
    } catch (err) {
      console.error("[ShinigamiSource] getLatest error:", err);
      return [];
    }
  }

  async search(filters: SearchFilters): Promise<MangaItem[]> {
    try {
      const page = filters.page || 1;
      const queryParam = filters.query ? `&q=${encodeURIComponent(filters.query)}` : "";
      const res = await fetch(`${this.apiBaseUrl}/v1/manga/list?page=${page}&page_size=30${queryParam}`, {
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`Shinigami API search error: ${res.status}`);
      const json = await res.json();
      return Array.isArray(json.data) ? json.data.map((item: any) => this.mapItem(item)) : [];
    } catch (err) {
      console.error("[ShinigamiSource] search error:", err);
      return [];
    }
  }

  async getChapters(slug: string): Promise<Chapter[]> {
    const chaptersCacheKey = `shinigami_full_chapters_v4_${slug}`;
    const cachedChapters = appCache.get<Chapter[]>(chaptersCacheKey);
    if (cachedChapters && cachedChapters.length > 0) return cachedChapters;

    const allChapters: Chapter[] = [];
    let page = 1;
    const pageSize = 500;

    try {
      while (true) {
        const res = await fetch(
          `${this.apiBaseUrl}/v1/chapter/${slug}/list?page=${page}&page_size=${pageSize}`,
          {
            next: { revalidate: 600 },
            headers: { "Accept": "application/json" },
          }
        );
        if (!res.ok) break;

        const json = await res.json();
        const list = json.data;
        if (!Array.isArray(list) || list.length === 0) break;

        for (const ch of list) {
          if (!ch || !ch.chapter_id) continue;
          const rawNum = ch.chapter_number != null ? String(ch.chapter_number).trim() : "0";
          const parsedNum = parseFloat(rawNum);
          const normalizedNum = !isNaN(parsedNum) ? String(parsedNum) : rawNum;
          const chTitle = ch.chapter_title
            ? `Chapter ${normalizedNum}: ${ch.chapter_title}`
            : `Chapter ${normalizedNum}`;

          allChapters.push({
            id: ch.chapter_id,
            slug: ch.chapter_id,
            title: chTitle,
            number: normalizedNum,
            releaseDate: ch.release_date
              ? new Date(ch.release_date).toLocaleDateString("id-ID")
              : undefined,
          });
        }

        if (list.length < pageSize) break;
        page++;
      }

      // Sort Ascending: Chapter 1 ... Latest Chapter
      const sortedChapters = sortChapters(allChapters, "asc");

      appCache.set(chaptersCacheKey, sortedChapters, 1800);
      return sortedChapters;
    } catch (err) {
      console.error(`[ShinigamiSource] getChapters error for ${slug}:`, err);
      return [];
    }
  }

  async getDetail(slug: string): Promise<MangaDetail> {
    const cacheKey = `shinigami_detail_${slug}`;
    const cached = appCache.get<MangaDetail>(cacheKey);
    if (cached) return cached;

    const [detailRes, chapters] = await Promise.all([
      fetch(`${this.apiBaseUrl}/v1/manga/detail/${slug}`, {
        next: { revalidate: 1800 },
        headers: { "Accept": "application/json" },
      }),
      this.getChapters(slug),
    ]);

    if (!detailRes.ok) {
      throw new Error(`Gagal memuat detail komik Shinigami: ${detailRes.status}`);
    }

    const detailJson = await detailRes.json();
    const item = detailJson.data || {};

    const cover = item.cover_portrait_url || item.cover_image_url || "";
    let format = "Manga";
    if (Array.isArray(item.taxonomy?.Format) && item.taxonomy.Format.length > 0) {
      format = item.taxonomy.Format[0].name || "Manga";
    } else if (item.country_id === "KR") {
      format = "Manhwa";
    } else if (item.country_id === "CN") {
      format = "Manhua";
    }

    let genres: string[] = [];
    if (Array.isArray(item.taxonomy?.Genre)) {
      genres = item.taxonomy.Genre.map((g: any) => g.name || g.slug || String(g));
    }

    let author = "";
    if (Array.isArray(item.taxonomy?.Author) && item.taxonomy.Author.length > 0) {
      author = item.taxonomy.Author.map((a: any) => a.name).join(", ");
    }

    const mangaDetail: MangaDetail = {
      id: item.manga_id || slug,
      slug: item.manga_id || slug,
      title: this.cleanText(item.title) || slug,
      alternativeTitle: item.alternative_title || undefined,
      cover,
      image: cover,
      thumbnail: cover,
      poster: cover,
      banner: item.cover_image_url || cover,
      bannerImage: item.cover_image_url || cover,
      synopsis: item.description ? this.cleanText(item.description) : "Tidak ada sinopsis.",
      author: author || undefined,
      status: item.status === 1 ? "Ongoing" : "Completed",
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

  async getChapterPages(chapterSlug: string): Promise<ChapterPages> {
    const cacheKey = `shinigami_ch_${chapterSlug}`;
    const cached = appCache.get<ChapterPages>(cacheKey);
    if (cached) return cached;

    const res = await fetch(`${this.apiBaseUrl}/v1/chapter/detail/${chapterSlug}`, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Gagal mengambil halaman chapter Shinigami (${res.status})`);
    }

    const json = await res.json();
    const d = json.data || {};
    const baseUrl = d.base_url || "https://assets.shngm.id";
    const path = d.chapter?.path || "";
    const fileList: string[] = Array.isArray(d.chapter?.data) ? d.chapter.data : [];

    const pages = fileList.map((file) => `${baseUrl}${path}${file}`);

    const rawNum = d.chapter_number != null ? String(d.chapter_number).trim() : "";
    const parsedNum = parseFloat(rawNum);
    const normalizedNum = !isNaN(parsedNum) ? String(parsedNum) : rawNum;

    const chTitle = d.chapter_title
      ? `Chapter ${normalizedNum}: ${d.chapter_title}`
      : `Chapter ${normalizedNum}`;

    let prevChapterId = d.prev_chapter_id || null;
    let nextChapterId = d.next_chapter_id || null;

    // Fallback if prev or next is missing and manga_id is available
    if ((!prevChapterId || !nextChapterId) && d.manga_id) {
      try {
        const chapters = await this.getChapters(d.manga_id);
        const currIdx = chapters.findIndex(
          (c) => c.id === chapterSlug || c.slug === chapterSlug || c.number === normalizedNum
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

    const result: ChapterPages = {
      chapterId: d.chapter_id || chapterSlug,
      mangaId: d.manga_id,
      title: chTitle,
      pages,
      prevChapterId,
      nextChapterId,
      sourceId: this.id,
    };

    appCache.set(cacheKey, result, 3600);
    return result;
  }
}
