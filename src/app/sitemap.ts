import type { MetadataRoute } from "next";
import { sourceManager } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://voidverse.my.id";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/following`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/profile`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/settings`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const mangaEntries: MetadataRoute.Sitemap = [];
  const seenUrls = new Set<string>();

  try {
    const availableSources = sourceManager.getAvailableSources();

    const fetchPromises = availableSources.map(async ({ id }) => {
      try {
        const source = sourceManager.getSource(id);
        const popular = await source.getPopular(1);
        return popular;
      } catch (err) {
        console.warn(`[Sitemap] Failed to get popular manga for ${id}:`, err);
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    for (const res of results) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        for (const item of res.value) {
          if (!item?.id) continue;

          let mangaUrl = `${baseUrl}/manga/${encodeURIComponent(item.id)}`;
          if (
            item.sourceId &&
            item.sourceId !== "komiku" &&
            !item.id.startsWith("webtoon") &&
            !/^[0-9a-f]{8}-/i.test(item.id)
          ) {
            mangaUrl += `?source=${encodeURIComponent(item.sourceId)}`;
          }

          if (!seenUrls.has(mangaUrl)) {
            seenUrls.add(mangaUrl);
            mangaEntries.push({
              url: mangaUrl,
              lastModified: new Date(),
              changeFrequency: "daily",
              priority: 0.8,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("[Sitemap] Global fetch error:", err);
  }

  // Guaranteed popular manga fallback entries so sitemap is always populated
  const fallbackManga = [
    "demonic-emperor",
    "one-piece",
    "solo-leveling",
    "martial-peak",
    "nano-machine",
    "eleceed",
    "lookism",
    "omniscient-readers-viewpoint",
  ];

  for (const slug of fallbackManga) {
    const url = `${baseUrl}/manga/${slug}`;
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      mangaEntries.push({
        url,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  }

  return [...staticRoutes, ...mangaEntries];
}
