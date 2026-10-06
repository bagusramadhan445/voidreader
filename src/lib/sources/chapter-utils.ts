import { Chapter } from "./types";

/**
 * Checks if a string is a standard UUID.
 */
export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

/**
 * Normalizes and extracts numeric chapter value from a Chapter object, title, or string.
 * Returns null if no numeric chapter value can be identified.
 */
export function parseChapterNumber(
  ch: Chapter | string | { title?: string; number?: string; id?: string; slug?: string } | null | undefined
): number | null {
  if (!ch) return null;

  // 1. If explicit chapter number property is defined
  if (typeof ch === "object" && ch.number !== undefined && ch.number !== null && ch.number !== "") {
    const parsed = parseFloat(String(ch.number));
    if (!isNaN(parsed)) return parsed;
  }

  const title = typeof ch === "string" ? ch : ch.title || "";
  const slug = typeof ch === "object" ? ch.slug || ch.id || "" : "";

  // 2. Detect Prologue as Chapter 0
  if (/\b(?:prolog|prologue)\b/i.test(title)) {
    return 0;
  }

  // 3. Match explicit chapter prefixes in title: Chapter 918, Ch. 918, Ep 918, Bab 918, #918
  if (title) {
    const prefixMatch = title.match(/(?:chapter|ch|ep|episode|bab|part)\s*[-_.:#]*\s*([\d.]+)/i);
    if (prefixMatch && prefixMatch[1]) {
      const parsed = parseFloat(prefixMatch[1]);
      if (!isNaN(parsed)) return parsed;
    }

    const hashMatch = title.match(/#\s*([\d.]+)/);
    if (hashMatch && hashMatch[1]) {
      const parsed = parseFloat(hashMatch[1]);
      if (!isNaN(parsed)) return parsed;
    }

    // Number at beginning of title, e.g. "918 - Battle" or "918: Battle"
    const startNumMatch = title.match(/^\s*([\d.]+)\s*[-_:]/);
    if (startNumMatch && startNumMatch[1]) {
      const parsed = parseFloat(startNumMatch[1]);
      if (!isNaN(parsed)) return parsed;
    }
  }

  // 4. Match in slug/id (only with chapter prefix or trailing format to avoid UUID false positives)
  if (slug && !isUuid(slug)) {
    const slugPrefixMatch = slug.match(/(?:chapter|ch|ep|episode|bab)[-_ ]*([\d.]+)/i);
    if (slugPrefixMatch && slugPrefixMatch[1]) {
      const parsed = parseFloat(slugPrefixMatch[1]);
      if (!isNaN(parsed)) return parsed;
    }

    // Trailing double hyphen e.g. webtoon--action--manga--10--ep-1--1
    const trailingMatch = slug.match(/--([\d.]+)$/);
    if (trailingMatch && trailingMatch[1]) {
      const parsed = parseFloat(trailingMatch[1]);
      if (!isNaN(parsed)) return parsed;
    }

    // Trailing single hyphen e.g. manga-title-918
    const singleTrailingMatch = slug.match(/[-_]([\d.]+)$/);
    if (singleTrailingMatch && singleTrailingMatch[1]) {
      const parsed = parseFloat(singleTrailingMatch[1]);
      if (!isNaN(parsed)) return parsed;
    }
  }

  // 5. Standalone number anywhere in title (boundary check)
  if (title) {
    const standaloneMatch = title.match(/\b([\d.]+)\b/);
    if (standaloneMatch && standaloneMatch[1]) {
      const parsed = parseFloat(standaloneMatch[1]);
      if (!isNaN(parsed)) return parsed;
    }
  }

  return null;
}

/**
 * Sorts chapters strictly by numeric chapter value.
 * - "asc": Oldest sorting: Chapter 1 -> latest chapter ascending
 * - "desc": Latest sorting: Latest chapter -> Chapter 1 descending
 */
export function sortChapters(chapters: Chapter[], direction: "asc" | "desc" = "asc"): Chapter[] {
  return [...chapters].sort((a, b) => {
    const numA = parseChapterNumber(a);
    const numB = parseChapterNumber(b);

    if (numA !== null && numB !== null) {
      if (numA !== numB) {
        return direction === "asc" ? numA - numB : numB - numA;
      }
      return direction === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    }

    if (numA !== null && numB === null) return direction === "asc" ? -1 : 1;
    if (numA === null && numB !== null) return direction === "asc" ? 1 : -1;

    return a.title.localeCompare(b.title);
  });
}

/**
 * Filters chapters by search query and sorts them.
 * - Exact chapter number match first: searching "918" only matches Chapter 918.
 *   Does not match partial numbers like 91, 189, 9189.
 * - Text search matches title or human-readable slug. Raw UUIDs are never matched.
 */
export function filterAndSortChapters(
  chapters: Chapter[],
  searchQuery: string,
  direction: "asc" | "desc" = "asc"
): Chapter[] {
  const trimmed = searchQuery.trim();
  if (!trimmed) {
    return sortChapters(chapters, direction);
  }

  // Check if query is targeting a chapter number (e.g. "918", "ch 918", "chapter 918", "ep 918", "bab 918", "#918")
  const numMatch = trimmed.match(/^(?:chapter|ch|ep|episode|bab|part)?\s*#?\s*([\d.]+)$/i);

  if (numMatch && numMatch[1]) {
    const targetNum = parseFloat(numMatch[1]);
    if (!isNaN(targetNum)) {
      // EXACT CHAPTER NUMBER MATCH: only return chapters whose numeric value strictly equals targetNum
      const exactMatches = chapters.filter((ch) => {
        const chNum = parseChapterNumber(ch);
        return chNum !== null && chNum === targetNum;
      });

      return sortChapters(exactMatches, direction);
    }
  }

  // Text-based search
  const qLower = trimmed.toLowerCase();
  const embeddedNumMatch = trimmed.match(/\b([\d.]+)\b/);
  const targetEmbeddedNum = embeddedNumMatch ? parseFloat(embeddedNumMatch[1]) : null;

  const filtered = chapters.filter((ch) => {
    // 1. Check title match
    if (ch.title.toLowerCase().includes(qLower)) {
      return true;
    }

    // 2. Check slug match only if slug is human-readable (not a random UUID)
    if (ch.slug && !isUuid(ch.slug) && ch.slug.toLowerCase().includes(qLower)) {
      return true;
    }

    return false;
  });

  return filtered.sort((a, b) => {
    if (targetEmbeddedNum !== null) {
      const aNum = parseChapterNumber(a);
      const bNum = parseChapterNumber(b);
      const aIsExact = aNum === targetEmbeddedNum;
      const bIsExact = bNum === targetEmbeddedNum;
      if (aIsExact && !bIsExact) return -1;
      if (!aIsExact && bIsExact) return 1;
    }

    const numA = parseChapterNumber(a);
    const numB = parseChapterNumber(b);

    if (numA !== null && numB !== null) {
      if (numA !== numB) {
        return direction === "asc" ? numA - numB : numB - numA;
      }
      return direction === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    }

    if (numA !== null && numB === null) return direction === "asc" ? -1 : 1;
    if (numA === null && numB !== null) return direction === "asc" ? 1 : -1;

    return a.title.localeCompare(b.title);
  });
}
