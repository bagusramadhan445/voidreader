/**
 * Image normalization utility for Void Verse
 *
 * Rules:
 * - empty/null/dummy placeholder => /placeholder.jpg
 * - local assets (/placeholder...) or proxy (/api/proxy/image...) => keep as-is
 * - dead Komiku domains (thumbnail.komiku.to, etc.) => rewrite to thumbnail.komiku.org
 * - webtoon-phinf.pstatic.net / pstatic.net => route via /api/proxy/image?url=...
 * - relative URL => convert to absolute URL based on source or default
 * - invalid URL => /placeholder.jpg
 */

/**
 * Checks if a URL represents a missing, empty, or fallback placeholder image.
 */
export function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return true;
  }
  const trimmed = url.trim().toLowerCase();
  return (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === '""' ||
    trimmed === "''" ||
    trimmed.startsWith("/placeholder") ||
    trimmed.includes("placeholder.jpg") ||
    trimmed.includes("lazy.jpg") ||
    trimmed.startsWith("data:image")
  );
}

/**
 * Maps source IDs to their primary base URLs for resolving relative cover URLs.
 */
function resolveBaseUrl(sourceOrBase?: string): string {
  if (!sourceOrBase) return "https://komiku.org";
  if (sourceOrBase.startsWith("http://") || sourceOrBase.startsWith("https://")) {
    return sourceOrBase;
  }
  const s = sourceOrBase.toLowerCase();
  if (s.includes("komikcast")) return "https://komikcast.bz";
  if (s.includes("shinigami")) return "https://shinigami.moe";
  if (s.includes("webtoon")) return "https://www.webtoons.com";
  return "https://komiku.org";
}

/**
 * Normalizes an image URL from any provider.
 */
export function normalizeImageUrl(
  url: string | null | undefined,
  baseUrlOrSource?: string
): string {
  if (isPlaceholderUrl(url)) {
    return "/placeholder.jpg";
  }

  let cleanUrl = (url as string).trim();

  // If already an internal local asset or API proxy, return as is
  if (cleanUrl.startsWith("/placeholder") || cleanUrl.startsWith("/api/")) {
    return cleanUrl;
  }

  // Handle srcset format if passed (e.g. "https://domain.com/image.jpg 240w, ...")
  // Only split on whitespace if there is a width or pixel-density descriptor
  if (/\s+\d+[wx]/i.test(cleanUrl)) {
    const firstCandidate = cleanUrl.split(",")[0]?.trim().split(/\s+/)[0];
    if (firstCandidate) cleanUrl = firstCandidate;
  }

  // Rewrite dead Komiku domains to the active thumbnail.komiku.org / komiku.org
  cleanUrl = cleanUrl
    .replace(/^https?:\/\/thumbnail\.komiku\.(?:to|id)/i, "https://thumbnail.komiku.org")
    .replace(/^https?:\/\/img\.komiku\.id/i, "https://thumbnail.komiku.org")
    .replace(/^https?:\/\/komiku\.(?:to|id)/i, "https://komiku.org");

  // If image is from LINE Webtoon servers, route through proxy with Referer
  if (
    cleanUrl.includes("webtoon-phinf.pstatic.net") ||
    cleanUrl.includes("pstatic.net")
  ) {
    return `/api/proxy/image?url=${encodeURIComponent(cleanUrl)}`;
  }

  // Convert protocol-relative URL
  if (cleanUrl.startsWith("//")) {
    cleanUrl = "https:" + cleanUrl;
  } else if (cleanUrl.startsWith("/")) {
    const base = resolveBaseUrl(baseUrlOrSource);
    try {
      cleanUrl = new URL(cleanUrl, base).href;
    } catch {
      cleanUrl = `https://komiku.org${cleanUrl}`;
    }
  } else if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    const base = resolveBaseUrl(baseUrlOrSource);
    try {
      cleanUrl = new URL(cleanUrl, base.endsWith("/") ? base : `${base}/`).href;
    } catch {
      cleanUrl = `https://komiku.org/${cleanUrl}`;
    }
  }

  // Validate URL format
  try {
    const parsed = new URL(cleanUrl);
    if (!parsed.protocol.startsWith("http")) {
      return "/placeholder.jpg";
    }
    return cleanUrl;
  } catch {
    return "/placeholder.jpg";
  }
}

/**
 * Extracts all valid, non-placeholder cover candidate URLs from a manga object.
 * Returns an ordered array of candidate URLs (or ["/placeholder.jpg"] if none found).
 */
export function getMangaCoverCandidates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  manga: any,
  baseUrlOrSource?: string
): string[] {
  if (!manga) return ["/placeholder.jpg"];

  // If passed a plain string URL
  if (typeof manga === "string") {
    const normalized = normalizeImageUrl(manga, baseUrlOrSource);
    return isPlaceholderUrl(normalized) ? ["/placeholder.jpg"] : [normalized];
  }

  const effectiveSource = manga.sourceId || baseUrlOrSource;

  // Potential fields in order of priority
  const rawFields: (string | null | undefined)[] = [
    manga.cover,
    manga.thumbnail,
    manga.coverUrl,
    manga.image,
    manga.poster,
    manga.banner,
    manga.bannerImage,
  ];

  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const field of rawFields) {
    if (!field || typeof field !== "string") continue;
    if (isPlaceholderUrl(field)) continue;

    const normalized = normalizeImageUrl(field, effectiveSource);
    if (!isPlaceholderUrl(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      candidates.push(normalized);
    }
  }

  return candidates.length > 0 ? candidates : ["/placeholder.jpg"];
}

/**
 * Returns the best available cover URL for a manga item without discarding valid fallbacks.
 */
export function getBestMangaCover(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  manga: any,
  baseUrlOrSource?: string
): string {
  const candidates = getMangaCoverCandidates(manga, baseUrlOrSource);
  return candidates[0] || "/placeholder.jpg";
}
