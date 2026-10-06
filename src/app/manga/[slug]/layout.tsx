import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cleanTitle = slug
    .replace(/^webtoon-/i, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const title = `${cleanTitle} Chapter Terbaru Bahasa Indonesia - Void Reader`;
  const description = `Baca komik ${cleanTitle} Bahasa Indonesia terbaru gratis di Void Reader. Portal baca manga, manhwa, dan manhua kualitas HD dengan update tercepat.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Void Reader",
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    keywords: [cleanTitle, `${cleanTitle} bahasa indonesia`, "baca manga", "komik", "void reader"],
  };
}

export default function MangaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
