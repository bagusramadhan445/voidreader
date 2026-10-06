import Dexie, { type Table } from "dexie";

export interface BookmarkRecord {
  id: string; // mangaId / slug
  title: string;
  cover?: string;
  thumbnail: string;
  type: string;
  latestChapter?: string;
  sourceId: string;
  createdAt: number;
}

export interface HistoryRecord {
  id: string; // mangaId / slug
  title: string;
  cover?: string;
  thumbnail: string;
  lastChapterId: string;
  lastChapterTitle: string;
  lastReadAt: number;
  sourceId: string;
}

export interface ReadingProgressRecord {
  chapterId: string;
  mangaId?: string;
  pageIndex: number;
  scrollPercent: number;
  updatedAt: number;
}

export interface DownloadedChapterRecord {
  chapterId: string;
  mangaId: string;
  mangaTitle: string;
  chapterTitle: string;
  pages: string[]; // data URLs or cached blob URIs
  pageCount: number;
  downloadedAt: number;
  sizeBytes?: number;
}

export interface UserSettingsRecord {
  id: string; // 'current'
  theme: "dark" | "oled";
  imageQuality: "hd" | "medium" | "low";
  readingMode: "vertical" | "paged";
  autoLoadNextPage: boolean;
  fullscreenMode: boolean;
  showReadingProgress: boolean;
  smoothAnimations: boolean;
  defaultSource?: string;
  readerBg?: "black" | "dark" | "sepia";
  readerSpacing?: "small" | "medium" | "large";
  readerBrightness?: number; // 50 - 100
  zoomLevel?: number; // 100, 125, 150
  autoHideHUD?: boolean;
  autoNextChapter?: boolean;
  updatedAt: number;
}

export interface CommentRecord {
  id: string;
  mangaId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  content: string;
  isSpoiler: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface ChapterCommentRecord {
  id: string;
  sourceId: string;
  mangaId: string;
  chapterId: string;
  userId: string;
  username: string;
  avatar: string;
  comment: string;
  parentId?: string | null;
  likes: number;
  likedBy: string[];
  createdAt: number;
  synced: boolean; // false if created offline and pending sync
}

export interface UserFollowRecord {
  id: string; // composite `${sourceId}::${mangaId}`
  userId: string;
  sourceId: string;
  mangaId: string;
  title: string;
  cover: string;
  lastChapter?: string; // chapter terakhir dibaca
  latestChapter?: string; // update terbaru chapter
  createdAt: number;
  updatedAt?: number;
}

export interface MangaReviewRecord {
  id: string;
  sourceId: string;
  mangaId: string;
  userId: string;
  username: string;
  avatar?: string;
  rating: number; // 1-5
  review: string;
  createdAt: number;
  updatedAt?: number;
  synced?: boolean;
}

export class VoidReaderDatabase extends Dexie {
  bookmarks!: Table<BookmarkRecord, string>;
  history!: Table<HistoryRecord, string>;
  readingProgress!: Table<ReadingProgressRecord, string>;
  downloads!: Table<DownloadedChapterRecord, string>;
  userSettings!: Table<UserSettingsRecord, string>;
  comments!: Table<CommentRecord, string>;
  chapterComments!: Table<ChapterCommentRecord, string>;
  userFollows!: Table<UserFollowRecord, string>;
  mangaReviews!: Table<MangaReviewRecord, string>;

  constructor() {
    super("VoidReaderDB");
    this.version(1).stores({
      bookmarks: "id, title, createdAt",
      history: "id, lastReadAt",
      readingProgress: "chapterId, mangaId, updatedAt",
      downloads: "chapterId, mangaId, downloadedAt",
    });
    this.version(2).stores({
      bookmarks: "id, title, createdAt",
      history: "id, lastReadAt",
      readingProgress: "chapterId, mangaId, updatedAt",
      downloads: "chapterId, mangaId, downloadedAt",
      userSettings: "id",
      comments: "id, mangaId, createdAt",
    });
    this.version(3).stores({
      bookmarks: "id, title, createdAt",
      history: "id, lastReadAt",
      readingProgress: "chapterId, mangaId, updatedAt",
      downloads: "chapterId, mangaId, downloadedAt",
      userSettings: "id",
      comments: "id, mangaId, createdAt",
      chapterComments: "id, [sourceId+mangaId+chapterId], sourceId, mangaId, chapterId, parentId, createdAt, synced",
    });
    this.version(4).stores({
      bookmarks: "id, title, createdAt",
      history: "id, lastReadAt",
      readingProgress: "chapterId, mangaId, updatedAt",
      downloads: "chapterId, mangaId, downloadedAt",
      userSettings: "id",
      comments: "id, mangaId, createdAt",
      chapterComments: "id, [sourceId+mangaId+chapterId], sourceId, mangaId, chapterId, parentId, createdAt, synced",
      userFollows: "id, [sourceId+mangaId], sourceId, mangaId, userId, createdAt",
      mangaReviews: "id, [sourceId+mangaId], sourceId, mangaId, userId, rating, createdAt",
    });
  }
}

export const db = new VoidReaderDatabase();
