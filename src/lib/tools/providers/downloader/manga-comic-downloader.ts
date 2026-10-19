import { sourceManager, MangaItem, Chapter } from "@/lib/sources";
import { DownloaderResult, DownloaderStreamQuality } from "./types";
import { mangaProvider } from "../data/manga-provider";

export interface MangaComicDownloadOptions {
  chapterQuery?: string;
  sourceId?: string;
  format?: string;
}

export class MangaComicDownloader {
  readonly id = "manga_comic_downloader";
  readonly name = "Manga & Comic Archive Downloader";

  /**
   * Universal Manga & Comic Resolver & Download Preparer
   * Follows the standardized pipeline:
   * Search/URL -> Provider Resolver -> Metadata Extraction -> Content/Page Extraction -> Download Preparation -> Result
   */
  async resolve(
    queryOrUrl: string,
    options?: MangaComicDownloadOptions
  ): Promise<DownloaderResult> {
    const input = queryOrUrl.trim();
    if (!input) {
      return {
        success: false,
        platform: "Manga & Comic Downloader",
        sourceUrl: queryOrUrl,
        title: "",
        qualities: [],
        error: "Judul komik atau URL chapter tidak boleh kosong.",
      };
    }

    try {
      // 1. Check if input is a direct chapter URL or slug
      const isDirectChapter =
        input.includes("/ch/") ||
        input.includes("/chapter/") ||
        /chapter-\d+/i.test(input) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);

      if (isDirectChapter) {
        return await this.resolveDirectChapter(input, options?.sourceId);
      }

      // 2. Metadata Provider Search (Search comic across sources)
      let matchedManga: MangaItem | null = null;
      let matchedSourceId = options?.sourceId || "komiku";

      // Search local VoidVerse sources first (Komiku, Komikcast, Shinigami, Webtoon)
      const sourcesToTry = options?.sourceId
        ? [sourceManager.getSource(options.sourceId)]
        : [
            sourceManager.getSource("komiku"),
            sourceManager.getSource("komikcast"),
            sourceManager.getSource("shinigami"),
            sourceManager.getSource("webtoon"),
          ];

      for (const src of sourcesToTry) {
        try {
          const results = await src.search({ query: input });
          if (results && results.length > 0) {
            matchedManga = results[0];
            matchedSourceId = src.id;
            break;
          }
        } catch {
          // continue
        }
      }

      // Fallback: search MangaDex metadata if local sources yielded no direct match
      if (!matchedManga) {
        const mdResults = await mangaProvider.searchMangaDex(input, 3).catch(() => []);
        if (mdResults.length > 0) {
          const topMd = mdResults[0];
          matchedManga = {
            id: topMd.id,
            slug: topMd.id,
            title: topMd.title,
            cover: topMd.coverUrl || "",
            thumbnail: topMd.coverUrl || "",
            description: topMd.description,
            sourceId: "mangadex",
          };
          matchedSourceId = "mangadex";
        }
      }

      if (!matchedManga) {
        return {
          success: false,
          platform: "Manga & Comic Downloader",
          sourceUrl: input,
          title: input,
          qualities: [],
          error: `Komik atau manga dengan kata kunci "${input}" tidak ditemukan. Coba gunakan judul lain atau link chapter langsung.`,
        };
      }

      // 3. Content Extraction: Fetch Manga Detail and Chapters
      const source = sourceManager.getSource(matchedSourceId);
      const detail = await source.getDetail(matchedManga.id || matchedManga.slug || "").catch(() => null);

      const chapters: Chapter[] = detail?.chapters || [];
      if (chapters.length === 0) {
        return {
          success: false,
          platform: `Komik (${source.name})`,
          sourceUrl: input,
          title: matchedManga.title,
          thumbnail: matchedManga.cover,
          qualities: [],
          error: `Daftar chapter untuk komik "${matchedManga.title}" belum tersedia untuk diunduh.`,
        };
      }

      // 4. Chapter Selection: match user query or default to latest chapter
      let targetChapter: Chapter = chapters[0]; // default latest
      if (options?.chapterQuery) {
        const cq = options.chapterQuery.trim().toLowerCase();
        const found = chapters.find((c) => {
          const titleLower = c.title.toLowerCase();
          const idLower = c.id.toLowerCase();
          return (
            titleLower.includes(cq) ||
            idLower.includes(cq) ||
            c.number === cq ||
            titleLower === `chapter ${cq}` ||
            titleLower === `ch ${cq}`
          );
        });
        if (found) {
          targetChapter = found;
        }
      }

      // 5. Page Extraction: Fetch Chapter Pages
      let chapterPagesData = await source.getChapterPages(targetChapter.id).catch(() => null);
      let pages = chapterPagesData?.pages || [];

      // If default chapter has no pages (e.g. prologue note or text announcement), try next chapters
      if (pages.length === 0 && !options?.chapterQuery) {
        for (let i = 1; i < Math.min(chapters.length, 6); i++) {
          const altChapter = chapters[i];
          const altData = await source.getChapterPages(altChapter.id).catch(() => null);
          if (altData && altData.pages && altData.pages.length > 0) {
            targetChapter = altChapter;
            chapterPagesData = altData;
            pages = altData.pages;
            break;
          }
        }
      }

      if (pages.length === 0) {
        return {
          success: false,
          platform: `Komik (${source.name})`,
          sourceUrl: input,
          title: `${matchedManga.title} - ${targetChapter.title}`,
          thumbnail: matchedManga.cover,
          qualities: [],
          error: `Halaman gambar untuk ${targetChapter.title} tidak dapat diekstrak atau kosong.`,
        };
      }

      // 6. Download Preparation: Generate ZIP, CBZ, and PDF archive stream endpoints
      const safeTitle = matchedManga.title.replace(/[^\w\s-]/g, "").trim();
      const safeChapter = targetChapter.title.replace(/[^\w\s-]/g, "").trim();
      const fullTitle = `${safeTitle} - ${safeChapter}`;
      const estSizeMb = (pages.length * 0.45).toFixed(1);

      const zipUrl = `/api/tools/downloader/archive?type=zip&chapterSlug=${encodeURIComponent(
        targetChapter.id
      )}&source=${source.id}&title=${encodeURIComponent(fullTitle)}`;

      const cbzUrl = `/api/tools/downloader/archive?type=cbz&chapterSlug=${encodeURIComponent(
        targetChapter.id
      )}&source=${source.id}&title=${encodeURIComponent(fullTitle)}`;

      const pdfUrl = `/api/tools/downloader/archive?type=pdf&chapterSlug=${encodeURIComponent(
        targetChapter.id
      )}&source=${source.id}&title=${encodeURIComponent(fullTitle)}`;

      const qualities: DownloaderStreamQuality[] = [
        {
          label: `Paket Lengkap ZIP (${pages.length} Halaman)`,
          url: zipUrl,
          format: "zip",
          sizeFormatted: `~${estSizeMb} MB`,
        },
        {
          label: `Comic Book Archive (.cbz)`,
          url: cbzUrl,
          format: "cbz",
          sizeFormatted: `~${estSizeMb} MB`,
        },
        {
          label: `Dokumen Bacaan PDF (.pdf)`,
          url: pdfUrl,
          format: "pdf",
          sizeFormatted: `~${(pages.length * 0.4).toFixed(1)} MB`,
        },
      ];

      // Also provide first page high-res image option
      if (pages[0]) {
        qualities.push({
          label: "Sampul / Halaman Pertama (JPG)",
          url: pages[0],
          format: "jpg",
        });
      }

      return {
        success: true,
        platform: `Manga & Komik (${source.name})`,
        title: fullTitle,
        author: detail?.author || matchedManga.author || "Komik Author",
        thumbnail: matchedManga.cover || pages[0],
        duration: `${pages.length} Halaman`,
        qualities,
        sourceUrl: input,
        fileName: `${fullTitle.slice(0, 35).replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`,
        metadata: {
          mangaTitle: matchedManga.title,
          chapterTitle: targetChapter.title,
          chapterId: targetChapter.id,
          sourceId: source.id,
          totalPages: pages.length,
          availableChapters: chapters.slice(0, 20).map((c) => ({
            id: c.id,
            title: c.title,
            number: c.number,
          })),
          pagesQueue: pages.slice(0, 30),
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kesalahan sistem";
      return {
        success: false,
        platform: "Manga & Comic Downloader",
        sourceUrl: input,
        title: input,
        qualities: [],
        error: `Gagal memproses unduhan komik: ${msg}`,
      };
    }
  }

  /**
   * Resolves direct chapter URL or slug directly
   */
  private async resolveDirectChapter(
    chapterSlugOrUrl: string,
    sourceId?: string
  ): Promise<DownloaderResult> {
    let slug = chapterSlugOrUrl;
    try {
      if (chapterSlugOrUrl.startsWith("http")) {
        const u = new URL(chapterSlugOrUrl);
        const parts = u.pathname.split("/").filter(Boolean);
        slug = parts[parts.length - 1] || chapterSlugOrUrl;
      }
    } catch {
      // ignore
    }

    const source = sourceManager.getSourceForChapter(slug, sourceId);
    const chapterData = await source.getChapterPages(slug);

    if (!chapterData || !chapterData.pages || chapterData.pages.length === 0) {
      throw new Error(`Tidak dapat mengekstrak halaman gambar dari chapter "${slug}".`);
    }

    const title = chapterData.title || `Chapter ${slug}`;
    const pages = chapterData.pages;
    const estSizeMb = (pages.length * 0.45).toFixed(1);

    const zipUrl = `/api/tools/downloader/archive?type=zip&chapterSlug=${encodeURIComponent(
      slug
    )}&source=${source.id}&title=${encodeURIComponent(title)}`;

    const cbzUrl = `/api/tools/downloader/archive?type=cbz&chapterSlug=${encodeURIComponent(
      slug
    )}&source=${source.id}&title=${encodeURIComponent(title)}`;

    const pdfUrl = `/api/tools/downloader/archive?type=pdf&chapterSlug=${encodeURIComponent(
      slug
    )}&source=${source.id}&title=${encodeURIComponent(title)}`;

    return {
      success: true,
      platform: `Komik Chapter (${source.name})`,
      title,
      thumbnail: pages[0],
      duration: `${pages.length} Halaman`,
      sourceUrl: chapterSlugOrUrl,
      fileName: `${title.slice(0, 35).replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`,
      qualities: [
        {
          label: `Paket Lengkap ZIP (${pages.length} Halaman)`,
          url: zipUrl,
          format: "zip",
          sizeFormatted: `~${estSizeMb} MB`,
        },
        {
          label: `Comic Book Archive (.cbz)`,
          url: cbzUrl,
          format: "cbz",
          sizeFormatted: `~${estSizeMb} MB`,
        },
        {
          label: `Dokumen Bacaan PDF (.pdf)`,
          url: pdfUrl,
          format: "pdf",
          sizeFormatted: `~${(pages.length * 0.4).toFixed(1)} MB`,
        },
        {
          label: "Halaman Pertama (Pratinjau)",
          url: pages[0],
          format: "jpg",
        },
      ],
      metadata: {
        chapterId: slug,
        totalPages: pages.length,
        pagesQueue: pages.slice(0, 30),
      },
    };
  }
}

export const mangaComicDownloader = new MangaComicDownloader();
