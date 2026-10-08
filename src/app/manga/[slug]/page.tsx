import React, { Suspense } from "react";
import type { Metadata } from "next";
import { sourceManager, MangaDetail } from "@/lib/sources";
import { MangaDetailClient } from "@/components/manga/MangaDetailClient";
import { Loader2 } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getMangaData(
  slug: string,
  sourceId?: string
): Promise<{ manga: MangaDetail | null; sourceName: string }> {
  try {
    const source = sourceManager.getSourceForManga(slug, sourceId);
    const manga = await source.getDetail(slug);
    return { manga, sourceName: source.name };
  } catch (error) {
    console.error(`[MangaDetailPage] Failed to fetch manga ${slug}:`, error);
    return { manga: null, sourceName: "Void Reader" };
  }
}

export async function generateMetadata(
  { params, searchParams }: Props
): Promise<Metadata> {
  const { slug } = await params;
  const sParams = await searchParams;
  const sourceParam = typeof sParams?.source === "string" ? sParams.source : undefined;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://voidverse.my.id";
  const { manga } = await getMangaData(slug, sourceParam);

  if (!manga) {
    const cleanTitle = slug
      .replace(/^webtoon-/i, "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const fallbackTitle = `${cleanTitle} - Baca Manga Online`;
    const fallbackDesc = `Baca komik ${cleanTitle} Bahasa Indonesia terbaru gratis di Void Reader. Portal baca manga, manhwa, dan manhua kualitas HD dengan update tercepat.`;
    return {
      title: fallbackTitle,
      description: fallbackDesc,
      alternates: {
        canonical: `${siteUrl}/manga/${slug}`,
      },
      openGraph: {
        title: fallbackTitle,
        description: fallbackDesc,
        type: "book",
        url: `${siteUrl}/manga/${slug}`,
        locale: "id_ID",
        siteName: "Void Reader",
      },
      twitter: {
        card: "summary_large_image",
        title: fallbackTitle,
        description: fallbackDesc,
      },
    };
  }

  const title = `${manga.title} - Baca Manga Online`;
  const rawDesc =
    manga.synopsis ||
    manga.description ||
    `Baca komik ${manga.title} Bahasa Indonesia online gratis di Void Reader. Kualitas HD dengan update chapter tercepat.`;
  const description =
    rawDesc.length > 160 ? rawDesc.slice(0, 157).trim() + "..." : rawDesc;
  const coverImage = manga.cover || manga.thumbnail;

  return {
    title,
    description,
    keywords: [
      manga.title,
      `${manga.title} indonesia`,
      `${manga.title} chapter`,
      "baca manga",
      "baca komik online",
      "void reader",
      ...(manga.genres || []),
    ],
    alternates: {
      canonical: `${siteUrl}/manga/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "book",
      url: `${siteUrl}/manga/${slug}`,
      siteName: "Void Reader",
      locale: "id_ID",
      images: coverImage
        ? [
            {
              url: coverImage,
              alt: `${manga.title} Cover`,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: coverImage ? [coverImage] : [],
    },
  };
}

export default async function MangaDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sParams = await searchParams;
  const sourceParam = typeof sParams?.source === "string" ? sParams.source : undefined;

  const { manga, sourceName } = await getMangaData(slug, sourceParam);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://voidverse.my.id";

  // Schema.org Book JSON-LD structured data
  const jsonLd = manga
    ? {
        "@context": "https://schema.org",
        "@type": "Book",
        name: manga.title,
        headline: `${manga.title} - Baca Manga Online`,
        description:
          manga.synopsis ||
          manga.description ||
          `Baca komik ${manga.title} Bahasa Indonesia di Void Reader`,
        image: manga.cover || manga.thumbnail,
        author: {
          "@type": "Person",
          name: manga.author || "Unknown",
        },
        publisher: {
          "@type": "Organization",
          name: sourceName || "Void Reader",
        },
        genre: manga.genres,
        inLanguage: "id-ID",
        url: `${siteUrl}/manga/${slug}`,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#080B14] flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin" />
            <p className="mt-4 text-xs font-mono text-cyan-400 tracking-wider">
              MEMUAT DETAIL MANGA...
            </p>
          </div>
        }
      >
        <MangaDetailClient
          initialDetail={manga}
          slug={slug}
          sourceParam={sourceParam}
        />
      </Suspense>
    </>
  );
}
