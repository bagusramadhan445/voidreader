/**
 * Image normalization utility for Void Reader
 *
 * Rules:
 * - empty/null => /placeholder.jpg
 * - local assets (/placeholder...) or proxy (/api/proxy/image...) => keep as-is
 * - webtoon-phinf.pstatic.net / pstatic.net => route via /api/proxy/image?url=...
 * - relative URL => convert to absolute URL
 * - invalid URL => /placeholder.jpg
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") {
    return "/placeholder.jpg";
  }

  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === '""' ||
    trimmed === "''"
  ) {
    return "/placeholder.jpg";
  }

  // Filter dummy lazy load placeholders
  if (trimmed.includes("lazy.jpg") || trimmed.startsWith("data:image")) {
    return "/placeholder.jpg";
  }

  // Handle srcset format if passed (e.g. "url 240w, url2 480w")
  let cleanUrl = trimmed;
  if (cleanUrl.includes(" ") && (cleanUrl.includes(",") || cleanUrl.includes("w"))) {
    const parts = cleanUrl.split(",");
    const first = parts[0]?.trim().split(" ")[0];
    if (first) cleanUrl = first;
  }

  // If already an internal local asset or API proxy, return as is
  if (cleanUrl.startsWith("/placeholder") || cleanUrl.startsWith("/api/")) {
    return cleanUrl;
  }

  // If image is from LINE Webtoon servers, route through proxy with Referer
  if (
    cleanUrl.includes("webtoon-phinf.pstatic.net") ||
    cleanUrl.includes("pstatic.net")
  ) {
    return `/api/proxy/image?url=${encodeURIComponent(cleanUrl)}`;
  }

  // Convert relative URL to absolute URL
  if (cleanUrl.startsWith("//")) {
    cleanUrl = "https:" + cleanUrl;
  } else if (cleanUrl.startsWith("/")) {
    cleanUrl = "https://komiku.org" + cleanUrl;
  } else if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = "https://komiku.org/" + cleanUrl;
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
