import { db } from "./db";

export const DEFAULT_SOURCE_ID = "komiku";
export const SOURCE_STORAGE_KEY = "void_reader_default_source";

export interface SourceOption {
  id: string;
  label: string;
  name: string;
  badge: string;
  description: string;
}

export const AVAILABLE_SOURCES: SourceOption[] = [
  {
    id: "komiku",
    label: "Komiku ID",
    name: "Komiku Indonesia",
    badge: "ID",
    description: "Katalog manga & manhwa terlengkap Bahasa Indonesia",
  },
  {
    id: "komikcast",
    label: "Komikcast",
    name: "Komikcast Indonesia",
    badge: "Fast",
    description: "Server cepat dengan update chapter kilat",
  },
  {
    id: "shinigami",
    label: "Shinigami",
    name: "Shinigami Indonesia",
    badge: "HD",
    description: "Kualitas gambar HD premium & manhwa populer",
  },
  {
    id: "webtoon",
    label: "Webtoon ID",
    name: "Webtoon Indonesia",
    badge: "Official",
    description: "Komik resmi LINE Webtoon Bahasa Indonesia",
  },
];

export function getStoredSourceId(): string {
  if (typeof window === "undefined") return DEFAULT_SOURCE_ID;
  try {
    const fromLocal = localStorage.getItem(SOURCE_STORAGE_KEY);
    if (fromLocal === "lunar" || !AVAILABLE_SOURCES.some((s) => s.id === fromLocal)) {
      localStorage.setItem(SOURCE_STORAGE_KEY, DEFAULT_SOURCE_ID);
      document.cookie = `${SOURCE_STORAGE_KEY}=${encodeURIComponent(
        DEFAULT_SOURCE_ID
      )}; path=/; max-age=31536000; SameSite=Lax`;
      return DEFAULT_SOURCE_ID;
    }
    return fromLocal || DEFAULT_SOURCE_ID;
  } catch (e) {
    console.error("Error reading source from localStorage:", e);
  }
  return DEFAULT_SOURCE_ID;
}

export async function getActiveSourceId(): Promise<string> {
  if (typeof window === "undefined") return DEFAULT_SOURCE_ID;
  try {
    const fromLocal = localStorage.getItem(SOURCE_STORAGE_KEY);
    if (fromLocal === "lunar" || (fromLocal && !AVAILABLE_SOURCES.some((s) => s.id === fromLocal))) {
      localStorage.setItem(SOURCE_STORAGE_KEY, DEFAULT_SOURCE_ID);
      document.cookie = `${SOURCE_STORAGE_KEY}=${encodeURIComponent(
        DEFAULT_SOURCE_ID
      )}; path=/; max-age=31536000; SameSite=Lax`;
      try {
        await db.userSettings.update("current", { defaultSource: DEFAULT_SOURCE_ID });
      } catch {}
      return DEFAULT_SOURCE_ID;
    }
    if (fromLocal && AVAILABLE_SOURCES.some((s) => s.id === fromLocal)) {
      return fromLocal;
    }
    const settings = await db.userSettings.get("current");
    if (
      settings?.defaultSource === "lunar" ||
      (settings?.defaultSource && !AVAILABLE_SOURCES.some((s) => s.id === settings.defaultSource))
    ) {
      try {
        await db.userSettings.update("current", { defaultSource: DEFAULT_SOURCE_ID });
      } catch {}
      localStorage.setItem(SOURCE_STORAGE_KEY, DEFAULT_SOURCE_ID);
      return DEFAULT_SOURCE_ID;
    }
    if (settings?.defaultSource && AVAILABLE_SOURCES.some((s) => s.id === settings.defaultSource)) {
      localStorage.setItem(SOURCE_STORAGE_KEY, settings.defaultSource);
      return settings.defaultSource;
    }
    localStorage.setItem(SOURCE_STORAGE_KEY, DEFAULT_SOURCE_ID);
  } catch (e) {
    console.error("Error reading source:", e);
  }
  return DEFAULT_SOURCE_ID;
}

export async function setActiveSourceId(sourceId: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOURCE_STORAGE_KEY, sourceId);
    document.cookie = `${SOURCE_STORAGE_KEY}=${encodeURIComponent(
      sourceId
    )}; path=/; max-age=31536000; SameSite=Lax`;

    const existing = (await db.userSettings.get("current")) || {
      id: "current",
      theme: "dark",
      imageQuality: "hd",
      readingMode: "vertical",
      autoLoadNextPage: true,
      fullscreenMode: false,
      showReadingProgress: true,
      smoothAnimations: true,
      defaultSource: sourceId,
      updatedAt: Date.now(),
    };

    await db.userSettings.put({
      ...existing,
      defaultSource: sourceId,
      updatedAt: Date.now(),
    });

    window.dispatchEvent(
      new CustomEvent("void_source_changed", { detail: { sourceId } })
    );
  } catch (e) {
    console.error("Error saving active source:", e);
  }
}
