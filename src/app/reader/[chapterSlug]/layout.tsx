import type { Metadata } from "next";

type Props = {
  params: Promise<{ chapterSlug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: { params: Promise<{ chapterSlug: string }> }): Promise<Metadata> {
  const { chapterSlug } = await params;
  const cleanTitle = chapterSlug
    .replace(/^webtoon-/i, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const title = `Baca ${cleanTitle} Bahasa Indonesia - Void Reader`;
  const description = `Baca komik ${cleanTitle} Bahasa Indonesia online di Void Reader dengan pengalaman visual interaktif, kualitas HD, dan fitur bookmark otomatis.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Void Reader",
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    keywords: [cleanTitle, `${cleanTitle} bahasa indonesia`, "baca chapter", "reader", "void reader"],
  };
}

export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
