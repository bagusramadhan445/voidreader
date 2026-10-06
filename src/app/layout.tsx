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

export const metadata: Metadata = {
  title: "Void Reader - Portal Baca Manga Modern",
  description:
    "Aplikasi pembaca manga modern Bahasa Indonesia dengan tampilan streaming premium bertema Void Portal, cepat, dan nyaman.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Void Reader",
  },
  applicationName: "Void Reader",
  keywords: ["manga", "manhwa", "manhua", "komiku", "baca komik", "void reader"],
};

export const viewport: Viewport = {
  themeColor: "#080B14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark bg-[#080B14]">
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
