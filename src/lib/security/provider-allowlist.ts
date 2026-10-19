/**
 * Provider and Origin Allowlist for Void Verse
 * Ensures server secrets are only dispatched to verified official destinations.
 */

export const TRUSTED_PROVIDER_ORIGINS: Record<string, string[]> = {
  openai: ["https://api.openai.com"],
  gemini: ["https://generativelanguage.googleapis.com"],
  openrouter: ["https://openrouter.ai"],
  replicate: ["https://api.replicate.com", "https://replicate.com"],
  remove_bg: ["https://api.remove.bg"],
  github: ["https://api.github.com"],
  mangadex: ["https://api.mangadex.org", "https://uploads.mangadex.org"],
  anilist: ["https://graphql.anilist.co"],
  jikan: ["https://api.jikan.moe"],
};

export const TRUSTED_MANGA_IMAGE_HOSTS: string[] = [
  "komiku.org",
  "thumbnail.komiku.org",
  "thumbnail.komiku.to",
  "komiku.to",
  "api.komiku.org",
  "cvr.voratoon.id",
  "cvr.voratoon.com",
  "cdn.voratoon.com",
  "assets.shngm.id",
  "shinigami.moe",
  "komikcast.bz",
  "webtoon-phinf.pstatic.net",
  "pstatic.net",
  "webtoons.com",
  "uploads.mangadex.org",
  "s4.anilist.co",
  "cdn.myanimelist.net",
  "api.dicebear.com",
];

/**
 * Checks if a hostname belongs to a known legitimate manga/CDN image host
 */
export function isTrustedMangaImageHost(host: string): boolean {
  const cleanHost = host.toLowerCase().trim();
  return TRUSTED_MANGA_IMAGE_HOSTS.some(
    (allowed) => cleanHost === allowed || cleanHost.endsWith(`.${allowed}`)
  );
}

/**
 * Validates whether a given provider endpoint baseUrl is an authorized official destination.
 */
export function isTrustedProviderOrigin(providerId: string, urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const origin = parsed.origin.toLowerCase();
    const allowedList = TRUSTED_PROVIDER_ORIGINS[providerId.toLowerCase()];
    if (!allowedList) return false;
    return allowedList.includes(origin);
  } catch {
    return false;
  }
}

/**
 * Validates a custom or provided baseUrl for a given provider.
 * Returns { valid: boolean, error?: string, isOfficial: boolean }
 */
export function validateProviderBaseUrl(
  providerId: string,
  candidateUrl?: string
): { valid: boolean; error?: string; isOfficial: boolean } {
  if (!candidateUrl || !candidateUrl.trim()) {
    return { valid: true, isOfficial: true };
  }

  let parsed: URL;
  try {
    parsed = new URL(candidateUrl.trim());
  } catch {
    return { valid: false, error: "Base URL tidak valid.", isOfficial: false };
  }

  if (parsed.protocol !== "https:") {
    return {
      valid: false,
      error: "Base URL penyedia API wajib menggunakan protokol HTTPS terenkripsi.",
      isOfficial: false,
    };
  }

  const isOfficial = isTrustedProviderOrigin(providerId, candidateUrl);
  return { valid: true, isOfficial };
}
