import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://voidverse.my.id";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | Void Reader",
    default: "Void Reader - Baca Manga & Manhwa Online",
  },
  description:
    "Platform baca manga, manhwa, dan manhua Bahasa Indonesia terlengkap dan terupdate gratis di Void Reader. Tampilan streaming modern, cepat, dan nyaman.",
  applicationName: "Void Reader",
  authors: [{ name: "Void Reader" }],
  creator: "Void Reader",
  publisher: "Void Reader",
  keywords: [
    "baca manga",
    "baca manhwa",
    "baca manhua",
    "komik indonesia",
    "manga sub indo",
    "komiku",
    "komikcast",
    "shinigami",
    "webtoon",
    "baca komik online",
    "void reader",
    "voidverse",
  ],
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "516895113b809e24",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "Void Reader",
    title: "Void Reader - Baca Manga & Manhwa Online",
    description:
      "Platform baca manga, manhwa, dan manhua Bahasa Indonesia terlengkap dan terupdate gratis di Void Reader. Tampilan streaming modern, cepat, dan nyaman.",
    images: [
      {
        url: "/placeholder.jpg",
        width: 1200,
        height: 630,
        alt: "Void Reader - Baca Manga & Manhwa Online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Void Reader - Baca Manga & Manhwa Online",
    description:
      "Platform baca manga, manhwa, dan manhua Bahasa Indonesia terlengkap dan terupdate gratis di Void Reader.",
    images: ["/placeholder.jpg"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Void Reader",
  },
};

export const viewport: Viewport = {
  themeColor: "#080B14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Schema.org WebSite & WebApplication Structured Data for production domain
const schemaOrgGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Void Reader",
      alternateName: ["VoidReader", "VoidVerse"],
      description:
        "Platform baca manga, manhwa, dan manhua Bahasa Indonesia terlengkap dan terupdate gratis di Void Reader.",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/explore?query={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
      inLanguage: "id-ID",
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "Void Reader",
      url: siteUrl,
      applicationCategory: "EntertainmentApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      description:
        "Aplikasi web pembaca manga, manhwa, dan manhua modern Bahasa Indonesia dengan antarmuka cepat, responsif, dan hemat kuota.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "IDR",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark bg-[#080B14]">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgGraph) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#080B14] text-gray-100 font-sans antialiased selection:bg-cyan-500/30 selection:text-[#00E5FF]`}
      >
        {/* Subtle Ambient Cosmic Background Glows */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full filter blur-[120px] pointer-events-none -z-10" />
        <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full filter blur-[100px] pointer-events-none -z-10" />

        <Navbar />
        <main className="flex-1">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
