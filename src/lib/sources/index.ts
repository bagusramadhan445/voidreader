import { KomikuSource } from "./komiku";
import { KomikcastSource } from "./komikcast";
import { ShinigamiSource } from "./shinigami";
import { WebtoonSource } from "./webtoon";
import { MangaSource } from "./types";

class SourceManager {
  private sources: Map<string, MangaSource> = new Map();
  private defaultSourceId = "komiku";

  constructor() {
    this.registerSource(new KomikuSource());
    this.registerSource(new KomikcastSource());
    this.registerSource(new ShinigamiSource());
    this.registerSource(new WebtoonSource());
  }

  registerSource(source: MangaSource): void {
    this.sources.set(source.id, source);
  }

  getSource(id?: string): MangaSource {
    const targetId = id || this.defaultSourceId;
    const source = this.sources.get(targetId);
    if (!source) {
      // Fallback to default
      const defaultSource = this.sources.get(this.defaultSourceId);
      if (!defaultSource) {
        throw new Error(`Source ${targetId} not found and default source missing.`);
      }
      return defaultSource;
    }
    return source;
  }

  /**
   * Intelligently resolves the appropriate source for a given chapter slug:
   * 1. Query parameter sourceId (if valid)
   * 2. UUID detection -> Shinigami Indonesia
   * 3. Fallback to active/default source
   */
  getSourceForChapter(chapterSlug: string, sourceId?: string): MangaSource {
    if (sourceId && this.sources.has(sourceId)) {
      return this.sources.get(sourceId)!;
    }

    if (chapterSlug.startsWith("webtoon") && this.sources.has("webtoon")) {
      return this.sources.get("webtoon")!;
    }

    // Check UUID pattern typical of Shinigami chapter IDs
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterSlug);
    if (isUUID && this.sources.has("shinigami")) {
      return this.sources.get("shinigami")!;
    }

    return this.getSource(sourceId);
  }

  /**
   * Intelligently resolves the appropriate source for a given manga slug / ID:
   * 1. Query parameter sourceId (if valid)
   * 2. webtoon prefix detection -> Webtoon Indonesia
   * 3. UUID detection -> Shinigami Indonesia
   * 4. Fallback to active/default source
   */
  getSourceForManga(mangaSlug: string, sourceId?: string): MangaSource {
    if (sourceId && this.sources.has(sourceId)) {
      return this.sources.get(sourceId)!;
    }

    if (mangaSlug.startsWith("webtoon") && this.sources.has("webtoon")) {
      return this.sources.get("webtoon")!;
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mangaSlug);
    if (isUUID && this.sources.has("shinigami")) {
      return this.sources.get("shinigami")!;
    }

    return this.getSource(sourceId);
  }

  getAvailableSources(): { id: string; name: string }[] {
    return Array.from(this.sources.values()).map((s) => ({
      id: s.id,
      name: s.name,
    }));
  }

  setDefaultSource(id: string): void {
    if (this.sources.has(id)) {
      this.defaultSourceId = id;
    }
  }

  getDefaultSourceId(): string {
    return this.defaultSourceId;
  }
}

// Global singleton instance
const globalForSources = global as unknown as { sourceManager?: SourceManager };
export const sourceManager = globalForSources.sourceManager ?? new SourceManager();
if (process.env.NODE_ENV !== "production") globalForSources.sourceManager = sourceManager;

export * from "./types";
export * from "./chapter-utils";
export { KomikuSource, KomikcastSource, ShinigamiSource, WebtoonSource };
