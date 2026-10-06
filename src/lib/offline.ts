import { db, DownloadedChapterRecord } from "./db";

export class OfflineManager {
  /**
   * Check if a chapter is already downloaded locally
   */
  static async isChapterDownloaded(chapterId: string): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const record = await db.downloads.get(chapterId);
    return !!record;
  }

  /**
   * Get downloaded chapter record if exists
   */
  static async getDownloadedChapter(chapterId: string): Promise<DownloadedChapterRecord | null> {
    if (typeof window === "undefined") return null;
    const record = await db.downloads.get(chapterId);
    return record || null;
  }

  /**
   * Download a chapter for offline reading
   * Uses image proxy to fetch and convert into base64 / blob URLs
   */
  static async downloadChapter(
    chapterId: string,
    mangaId: string,
    mangaTitle: string,
    chapterTitle: string,
    imageUrls: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<DownloadedChapterRecord> {
    const downloadedPages: string[] = [];
    const total = imageUrls.length;

    for (let i = 0; i < total; i++) {
      const url = imageUrls[i];
      try {
        // Fetch through our proxy to avoid CORS and get clean binary
        const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        downloadedPages.push(base64Data);
      } catch (err) {
        console.warn(`[OfflineManager] Fallback saving URL directly for page ${i}:`, err);
        downloadedPages.push(url);
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    const record: DownloadedChapterRecord = {
      chapterId,
      mangaId,
      mangaTitle,
      chapterTitle,
      pages: downloadedPages,
      pageCount: downloadedPages.length,
      downloadedAt: Date.now(),
    };

    await db.downloads.put(record);
    return record;
  }

  /**
   * Delete downloaded chapter from local store
   */
  static async deleteDownload(chapterId: string): Promise<void> {
    await db.downloads.delete(chapterId);
  }

  /**
   * List all downloaded chapters
   */
  static async getAllDownloads(): Promise<DownloadedChapterRecord[]> {
    if (typeof window === "undefined") return [];
    return await db.downloads.orderBy("downloadedAt").reverse().toArray();
  }
}
