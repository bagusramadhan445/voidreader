export interface MangaItem {
  id: string; // slug identifier e.g. "one-piece"
  slug?: string; // alias for id
  title: string;
  cover: string; // Valid image URL (required by spec)
  thumbnail: string; // Maintained for backwards compatibility
  image?: string; // Additional alias
  poster?: string; // Additional alias
  banner?: string; // Additional alias
  type?: string; // Manga / Manhwa / Manhua
  latestChapter?: string;
  firstChapter?: string;
  rating?: string;
  genres?: string[];
  status?: string; // Ongoing / Completed
  updatedAt?: string;
  synopsis?: string;
  description?: string;
  author?: string;
  sourceId: string;
}

export interface Chapter {
  id: string; // slug chapter e.g. "one-piece-chapter-1100"
  slug?: string; // alias
  title: string; // e.g. "Chapter 1100"
  number?: string;
  releaseDate?: string;
}

export interface MangaDetail {
  id: string;
  slug?: string;
  title: string;
  alternativeTitle?: string;
  cover: string;
  image?: string;
  thumbnail: string;
  poster?: string;
  banner?: string;
  bannerImage?: string;
  synopsis: string;
  description?: string;
  author?: string;
  status: string;
  type: string;
  genres: string[];
  chapters: Chapter[];
  sourceId: string;
}

export interface ChapterPages {
  chapterId: string;
  mangaId?: string;
  title: string;
  pages: string[];
  prevChapterId?: string | null;
  nextChapterId?: string | null;
  sourceId: string;
}

export interface HomeData {
  featured: MangaItem[];
  popular: MangaItem[];
  latest: MangaItem[];
  recommendations: MangaItem[];
}

export interface SearchFilters {
  query?: string;
  genre?: string;
  status?: string;
  type?: string;
  page?: number;
}

export interface MangaSource {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;

  getHome(): Promise<HomeData>;
  getPopular(page?: number): Promise<MangaItem[]>;
  getLatest(page?: number): Promise<MangaItem[]>;
  search(filters: SearchFilters): Promise<MangaItem[]>;
  getDetail(slug: string): Promise<MangaDetail>;
  getChapterPages(chapterSlug: string): Promise<ChapterPages>;

  // Optional alias methods
  getMangaDetail?(slug: string): Promise<MangaDetail>;
  getChapters?(slug: string): Promise<Chapter[]>;
}

