"use client";

import React, { useState } from "react";
import {
  Globe,
  Tag,
  Image as ImageIcon,
  ExternalLink,
  Table,
  List,
  FileText,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Share2,
  BookOpen,
} from "lucide-react";
import {
  MetricPill,
  ResultSectionTitle,
  PropertyRow,
  CopyButton,
  VisualCodeBlock,
} from "./SharedComponents";

interface ScraperResultRendererProps {
  toolId: string;
  output: any;
  metadata?: any;
}

export const ScraperResultRenderer: React.FC<ScraperResultRendererProps> = ({
  toolId,
  output,
  metadata,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [linkFilter, setLinkFilter] = useState<"all" | "internal" | "external">("all");

  // Safe fallback if output is string or primitive
  if (!output || typeof output !== "object") {
    return (
      <div className="p-4 rounded-xl bg-[#080B14] border border-white/5 text-gray-200 leading-relaxed font-sans">
        {String(output)}
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 1. METADATA SCRAPER
  // -------------------------------------------------------------------
  if (toolId === "metadata-scraper") {
    const meta = output;
    const og = meta.openGraph || {};
    const twitter = meta.twitter || {};

    return (
      <div className="space-y-6">
        {/* Hero Card: Primary Page Info */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1427] to-[#111827] border border-cyan-500/20 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {meta.favicon ? (
                <img
                  src={meta.favicon}
                  alt="Favicon"
                  className="w-8 h-8 rounded-lg bg-black/40 p-1 shrink-0 border border-white/10 object-contain mt-0.5"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="p-2 rounded-lg bg-cyan-500/10 text-[#00E5FF] shrink-0 border border-cyan-500/20">
                  <Globe className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-white leading-snug break-words">
                  {meta.title || "Tidak ada judul halaman"}
                </h3>
                {meta.canonical && (
                  <a
                    href={meta.canonical}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline mt-1 truncate max-w-full font-mono"
                  >
                    <span>{meta.canonical}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>
            <CopyButton text={meta.title || ""} label="Salin Judul" />
          </div>

          {meta.description && (
            <p className="text-xs text-gray-300 leading-relaxed bg-[#080B14] p-3 rounded-xl border border-white/5">
              {meta.description}
            </p>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <MetricPill label="Bahasa" value={meta.language || "ID / Global"} variant="gray" />
            <MetricPill label="Encoding" value={meta.charset || "UTF-8"} variant="gray" />
            <MetricPill label="Robots" value={meta.robots || "Index, Follow"} variant="gray" />
            <MetricPill label="JSON-LD Schema" value={`${meta.jsonLdCount || 0} entitas`} variant="cyan" />
          </div>
        </div>

        {/* Social Card Preview (Open Graph & Twitter Card) */}
        {(og.image || twitter.image || og.title || twitter.title) && (
          <div className="space-y-3">
            <ResultSectionTitle title="Preview Kartu Sosial (Open Graph & Twitter)" icon={Share2} />
            <div className="max-w-lg rounded-2xl overflow-hidden border border-white/10 bg-[#080B14] shadow-xl">
              {(og.image || twitter.image) && (
                <div className="aspect-video w-full bg-black/60 relative overflow-hidden flex items-center justify-center">
                  <img
                    src={og.image || twitter.image}
                    alt={og.title || "Social Card"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono bg-black/70 text-cyan-300 border border-white/10 backdrop-blur-md">
                    {og.type || "website"}
                  </span>
                </div>
              )}
              <div className="p-4 space-y-2">
                <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  {og.site_name || "Situs Web"}
                </span>
                <h4 className="text-sm font-bold text-white line-clamp-2">
                  {og.title || twitter.title || meta.title}
                </h4>
                <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                  {og.description || twitter.description || meta.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SEO Keywords */}
        {meta.keywords && (
          <div className="space-y-3">
            <ResultSectionTitle title="Kata Kunci SEO (Meta Keywords)" icon={Tag} />
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[#080B14] border border-white/5">
              {String(meta.keywords)
                .split(",")
                .map((kw, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                  >
                    #{kw.trim()}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Technical Specs List */}
        <div className="space-y-2">
          <ResultSectionTitle title="Detail Meta Tag Lengkap" icon={Layers} />
          <div className="rounded-xl border border-white/5 bg-[#080B14] divide-y divide-white/5 overflow-hidden">
            <PropertyRow label="Penulis (Author)" value={meta.author} canCopy />
            <PropertyRow label="Canonical URL" value={meta.canonical} canCopy />
            <PropertyRow label="Favicon URL" value={meta.favicon} canCopy />
            <PropertyRow label="OG Title" value={og.title} canCopy />
            <PropertyRow label="OG Type" value={og.type} />
            <PropertyRow label="Twitter Card Type" value={twitter.card} />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 2. IMAGE SCRAPER
  // -------------------------------------------------------------------
  if (toolId === "image-scraper") {
    const images: string[] = Array.isArray(output.images) ? output.images : [];
    const dist = output.sourcesDistribution || {};

    const filteredImages = images.filter((url) =>
      url.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-5">
        {/* Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricPill label="Total Gambar" value={output.totalImages || images.length} icon={ImageIcon} variant="cyan" />
          <MetricPill label="Tag <img>" value={dist.imgTags || 0} variant="emerald" />
          <MetricPill label="Picture / Responsive" value={dist.pictureSources || 0} variant="purple" />
          <MetricPill label="Social / Meta" value={dist.metaSocial || 0} variant="amber" />
        </div>

        {/* Search Bar */}
        {images.length > 6 && (
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari tautan gambar..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#080B14] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        )}

        {/* Thumbnail Gallery Grid */}
        <div className="space-y-3">
          <ResultSectionTitle
            title="Galeri Aset Gambar Ditemukan"
            icon={ImageIcon}
            count={filteredImages.length}
            action={
              <CopyButton
                text={filteredImages.join("\n")}
                label="Salin Semua URL"
                size="sm"
              />
            }
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredImages.slice(0, 48).map((imgUrl, i) => (
              <div
                key={i}
                className="group relative rounded-xl border border-white/10 bg-[#080B14] overflow-hidden flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-md"
              >
                <div className="aspect-square w-full bg-black/40 flex items-center justify-center overflow-hidden relative">
                  <img
                    src={imgUrl}
                    alt={`Scraped asset ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute(
                        "src",
                        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%234B5563' stroke-width='1.5'><rect width='18' height='18' x='3' y='3' rx='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/></svg>"
                      );
                    }}
                  />
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/80 text-gray-300 border border-white/10">
                    #{i + 1}
                  </span>
                </div>
                <div className="p-2 bg-[#0c101d] flex items-center justify-between gap-1 border-t border-white/5">
                  <span className="text-[10px] font-mono text-gray-400 truncate max-w-[120px]">
                    {imgUrl.split("/").pop() || "image"}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={imgUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded hover:bg-white/10 text-cyan-400 hover:text-white transition-colors"
                      title="Buka gambar asli di tab baru"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <CopyButton text={imgUrl} label="" size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredImages.length > 48 && (
            <p className="text-center text-xs text-gray-400 pt-2 font-mono">
              Menampilkan 48 dari total {filteredImages.length} gambar. Gunakan tombol &quot;Salin Semua URL&quot; untuk daftar lengkap.
            </p>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 3. WEB SCRAPER (CSS Selector)
  // -------------------------------------------------------------------
  if (toolId === "web-scraper") {
    const items: Array<{ text: string; tag: string }> = Array.isArray(output.items)
      ? output.items
      : [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 p-3.5 rounded-xl bg-[#080B14] border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Selector:</span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/30">
              {output.selector || "body"}
            </span>
          </div>
          <MetricPill label="Total Elemen Ditemukan" value={output.matchesCount || items.length} variant="emerald" />
        </div>

        <div className="space-y-2">
          <ResultSectionTitle
            title="Daftar Elemen Hasil Ekstraksi"
            icon={List}
            count={items.length}
            action={
              <CopyButton
                text={items.map((it) => it.text).join("\n\n")}
                label="Salin Seluruh Teks"
              />
            }
          />

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#080B14] border border-white/5 hover:border-cyan-500/20 transition-all flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-cyan-300 uppercase">
                    &lt;{item.tag}&gt;
                  </span>
                  <p className="text-xs text-gray-200 leading-relaxed break-words font-sans">
                    {item.text}
                  </p>
                </div>
                <CopyButton text={item.text} label="Salin" size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 4. WEBSITE DATA EXTRACTOR (Tables, Headings, Lists, Paragraphs)
  // -------------------------------------------------------------------
  if (toolId === "website-data-extractor") {
    const summary = output.summary || {};
    const tables: any[] = Array.isArray(output.tables) ? output.tables : [];
    const headings: Array<{ tag: string; text: string }> = Array.isArray(output.headings)
      ? output.headings
      : [];
    const lists: Array<{ type: string; itemCount: number; items: string[] }> = Array.isArray(
      output.lists
    )
      ? output.lists
      : [];
    const paragraphs: string[] = Array.isArray(output.paragraphs) ? output.paragraphs : [];
    const semanticSections: Array<{ tag: string; heading?: string; snippet: string }> = Array.isArray(
      output.semanticSections
    )
      ? output.semanticSections
      : [];
    const navigationItems: Array<{ label: string; href?: string }> = Array.isArray(output.navigationItems)
      ? output.navigationItems
      : [];
    const pageMetadata = output.pageMetadata || {};
    const renderingNotice = output.renderingNotice;

    return (
      <div className="space-y-6">
        {/* SPA / Client-side rendering notice banner */}
        {renderingNotice && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5 text-amber-300">
                Pemberitahuan Client-Side Rendering (SPA):
              </span>
              <p className="opacity-90 leading-relaxed text-gray-300">{renderingNotice}</p>
            </div>
          </div>
        )}

        {/* Page Metadata Card (if available) */}
        {(pageMetadata.title || pageMetadata.description || pageMetadata.canonical) && (
          <div className="p-4 rounded-2xl bg-[#0c101d] border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 font-mono mb-2">
              <Globe className="w-3.5 h-3.5" />
              <span>Metadata Halaman Target</span>
            </div>
            {pageMetadata.title && <PropertyRow label="Judul Halaman" value={pageMetadata.title} canCopy copyValue={pageMetadata.title} />}
            {pageMetadata.description && <PropertyRow label="Deskripsi" value={pageMetadata.description} canCopy copyValue={pageMetadata.description} />}
            {pageMetadata.canonical && <PropertyRow label="URL Kanonikal" value={pageMetadata.canonical} canCopy copyValue={pageMetadata.canonical} />}
          </div>
        )}

        {/* Metric Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricPill label="Tabel Ditemukan" value={summary.totalTables ?? tables.length} icon={Table} variant="cyan" />
          <MetricPill label="Judul / Headings" value={summary.totalHeadings ?? headings.length} icon={Tag} variant="purple" />
          <MetricPill label="Daftar / Lists" value={summary.totalLists ?? lists.length} icon={List} variant="emerald" />
          <MetricPill label="Paragraf & Teks" value={summary.totalParagraphs ?? paragraphs.length} icon={FileText} variant="amber" />
        </div>

        {/* Structured Tables */}
        {tables.length > 0 && (
          <div className="space-y-4">
            <ResultSectionTitle title="Tabel Terstruktur Halaman" icon={Table} count={tables.length} />
            {tables.map((tbl, tIdx) => (
              <div
                key={tIdx}
                className="rounded-2xl border border-white/10 bg-[#080B14] overflow-hidden shadow-lg space-y-2"
              >
                <div className="px-4 py-2.5 bg-[#0c101d] flex items-center justify-between border-b border-white/5">
                  <span className="text-xs font-bold text-white font-mono">
                    Tabel #{tbl.tableIndex || tIdx + 1} ({tbl.rowCount || tbl.rows?.length || 0} Baris)
                  </span>
                  <CopyButton
                    text={JSON.stringify(tbl.rows, null, 2)}
                    label="Salin Data Tabel"
                    size="sm"
                  />
                </div>
                <div className="overflow-x-auto p-2">
                  <table className="w-full text-xs text-left border-collapse">
                    {tbl.headers && tbl.headers.length > 0 && (
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02]">
                          {tbl.headers.map((h: string, hI: number) => (
                            <th key={hI} className="px-3 py-2 font-bold text-cyan-400 font-mono">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody className="divide-y divide-white/5">
                      {tbl.rows?.slice(0, 15).map((row: any, rI: number) => (
                        <tr key={rI} className="hover:bg-white/[0.02] transition-colors">
                          {Array.isArray(row)
                            ? row.map((cell: any, cI: number) => (
                                <td key={cI} className="px-3 py-2 text-gray-300 font-sans">
                                  {String(cell)}
                                </td>
                              ))
                            : Object.values(row).map((cell: any, cI: number) => (
                                <td key={cI} className="px-3 py-2 text-gray-300 font-sans">
                                  {String(cell)}
                                </td>
                              ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Headings Hierarchy */}
        {headings.length > 0 && (
          <div className="space-y-3">
            <ResultSectionTitle title="Hierarki Judul (Headings)" icon={Tag} count={headings.length} />
            <div className="space-y-1.5 p-3 rounded-xl bg-[#080B14] border border-white/5 max-h-60 overflow-y-auto">
              {headings.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 uppercase shrink-0">
                    {h.tag}
                  </span>
                  <span className="text-gray-200 truncate">{h.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bullet Lists */}
        {lists.length > 0 && (
          <div className="space-y-3">
            <ResultSectionTitle title="Daftar Butir / List Items" icon={List} count={lists.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lists.map((lst, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#080B14] border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                    {lst.type.toUpperCase()} ({lst.itemCount} butir)
                  </span>
                  <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                    {lst.items.slice(0, 6).map((it, idx) => (
                      <li key={idx} className="truncate">
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paragraphs and Text Blocks */}
        {paragraphs.length > 0 && (
          <div className="space-y-3">
            <ResultSectionTitle title="Paragraf & Teks Konten" icon={FileText} count={paragraphs.length} />
            <div className="space-y-2">
              {paragraphs.slice(0, 15).map((pText, pIdx) => (
                <div
                  key={pIdx}
                  className="p-3 rounded-xl bg-[#080B14] border border-white/5 flex items-start justify-between gap-3 text-xs text-gray-300 hover:border-white/10 transition-colors"
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{pText}</p>
                  <CopyButton text={pText} label="Salin" size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Semantic Sections (main, article, section, aside) */}
        {semanticSections.length > 0 && (
          <div className="space-y-3">
            <ResultSectionTitle title="Struktur Semantik Halaman" icon={Layers} count={semanticSections.length} />
            <div className="grid grid-cols-1 gap-2">
              {semanticSections.slice(0, 8).map((sec, sIdx) => (
                <div key={sIdx} className="p-3 rounded-xl bg-[#080B14] border border-white/5 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 uppercase">
                      &lt;{sec.tag}&gt;
                    </span>
                    {sec.heading && <span className="font-semibold text-gray-200">{sec.heading}</span>}
                  </div>
                  <p className="text-gray-400 leading-relaxed">{sec.snippet}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        {navigationItems.length > 0 && (
          <div className="space-y-3">
            <ResultSectionTitle title="Tautan Navigasi Halaman" icon={Globe} count={navigationItems.length} />
            <div className="flex flex-wrap gap-2">
              {navigationItems.map((nav, nIdx) => (
                <div
                  key={nIdx}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-gray-300 flex items-center gap-1.5"
                >
                  <span className="font-medium text-white">{nav.label}</span>
                  {nav.href && <span className="text-[10px] text-cyan-400 font-mono">({nav.href})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 5. LINK EXTRACTOR
  // -------------------------------------------------------------------
  if (toolId === "link-extractor") {
    const internal: Array<{ href: string; text: string }> = Array.isArray(output.internalLinks)
      ? output.internalLinks
      : [];
    const external: Array<{ href: string; text: string; domain?: string }> = Array.isArray(
      output.externalLinks
    )
      ? output.externalLinks
      : [];

    const displayedLinks =
      linkFilter === "internal"
        ? internal
        : linkFilter === "external"
        ? external
        : [...internal, ...external];

    const searchedLinks = displayedLinks.filter((l) =>
      `${l.href} ${l.text}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-4">
        {/* Metric Pills */}
        <div className="grid grid-cols-3 gap-2">
          <MetricPill label="Total Tautan" value={output.totalUniqueLinks || internal.length + external.length} variant="cyan" />
          <MetricPill label="Tautan Internal" value={output.internalCount || internal.length} variant="emerald" />
          <MetricPill label="Tautan Eksternal" value={output.externalCount || external.length} variant="purple" />
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#080B14] border border-white/5 text-xs">
            {(["all", "internal", "external"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setLinkFilter(f)}
                className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all ${
                  linkFilter === f
                    ? "bg-cyan-500 text-black shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {f === "all" ? "Semua" : f}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter URL atau anchor text..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#080B14] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Links Table */}
        <div className="rounded-xl border border-white/5 bg-[#080B14] overflow-hidden">
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-[#0c101d] border-b border-white/5 z-10">
                <tr>
                  <th className="px-3.5 py-2 font-bold text-gray-400 uppercase text-[10px]">Teks Jangkar</th>
                  <th className="px-3.5 py-2 font-bold text-gray-400 uppercase text-[10px]">Target URL</th>
                  <th className="px-3.5 py-2 font-bold text-gray-400 uppercase text-[10px] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {searchedLinks.slice(0, 100).map((link, i) => {
                  const isInt = internal.some((l) => l.href === link.href);
                  return (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-3.5 py-2.5 text-gray-200 font-medium max-w-[200px] truncate">
                        {link.text || <span className="text-gray-500 italic">Tanpa teks</span>}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-cyan-300 max-w-[320px] truncate">
                        <span
                          className={`inline-block mr-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isInt
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          }`}
                        >
                          {isInt ? "INT" : "EXT"}
                        </span>
                        {link.href}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded hover:bg-white/10 text-cyan-400 hover:text-white transition-colors"
                            title="Buka tautan di tab baru"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <CopyButton text={link.href} label="" size="sm" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 6. ARTICLE EXTRACTOR
  // -------------------------------------------------------------------
  if (toolId === "article-extractor") {
    const text = typeof output === "string" ? output : output.articleText || "";
    const meta = metadata || output.metadata || {};

    return (
      <div className="space-y-4">
        {/* Article Header Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1427] to-[#111827] border border-cyan-500/20 space-y-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
            {meta.title || "Naskah Artikel Utama"}
          </h2>

          <div className="flex items-center flex-wrap gap-3 text-xs text-gray-400 pt-1">
            {meta.author && (
              <span className="flex items-center gap-1.5 text-cyan-300">
                <User className="w-3.5 h-3.5" />
                <span>{meta.author}</span>
              </span>
            )}
            {meta.publishDate && (
              <span className="flex items-center gap-1.5 text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(meta.publishDate).toLocaleDateString()}</span>
              </span>
            )}
            {meta.wordCount && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-[#00E5FF] font-mono font-bold border border-cyan-500/20">
                {meta.wordCount} Kata
              </span>
            )}
            {meta.readingTimeMinutes && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/20">
                ± {meta.readingTimeMinutes} Menit Baca
              </span>
            )}
          </div>
        </div>

        {/* Clean Article Reader Body */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#080B14] border border-white/5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
              Mode Baca Bersih (Reader View)
            </span>
            <CopyButton text={text} label="Salin Seluruh Naskah" />
          </div>

          <div className="prose prose-invert max-w-none text-sm text-gray-200 leading-relaxed space-y-4 font-sans whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 7. RSS FEED READER
  // -------------------------------------------------------------------
  if (toolId === "rss-feed-reader") {
    const feed = output.feed || output;
    const items: any[] = Array.isArray(feed.items) ? feed.items : [];

    return (
      <div className="space-y-4">
        {/* Feed Metadata Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-cyan-950/30 to-[#111827] border border-cyan-500/30 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">
              {feed.title || "RSS Feed Sindikasi"}
            </h3>
            <p className="text-xs text-gray-400 line-clamp-1">{feed.description || feed.url}</p>
          </div>
          <MetricPill label="Total Artikel" value={items.length} icon={BookOpen} variant="cyan" />
        </div>

        {/* Article Cards */}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#080B14] border border-white/5 hover:border-cyan-500/30 transition-all space-y-2 group shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-bold text-white group-hover:text-[#00E5FF] transition-colors leading-snug">
                  {item.title}
                </h4>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00E5FF] shrink-0 border border-cyan-500/30 transition-all"
                    title="Buka artikel"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {item.description && (
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {item.description.replace(/<[^>]+>/g, "")}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-gray-500">
                {item.pubDate && <span>📅 {new Date(item.pubDate).toLocaleDateString()}</span>}
                {item.author && <span>✍️ {item.author}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 8. JSON DATA EXTRACTOR
  // -------------------------------------------------------------------
  if (toolId === "json-data-extractor") {
    const rawVal = output;
    const isObj = typeof rawVal === "object" && rawVal !== null;
    const strVal = isObj ? JSON.stringify(rawVal, null, 2) : String(rawVal);

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-[#080B14] border border-cyan-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Target Key Path:</span>
            <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/30">
              {metadata?.keyPath || "Root Output"}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-gray-300">
            {Array.isArray(rawVal) ? "Array" : typeof rawVal}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#080B14] border border-white/5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Nilai Hasil Ekstraksi
            </span>
            <CopyButton text={strVal} label="Salin Nilai" />
          </div>
          {isObj ? (
            <VisualCodeBlock code={strVal} language="json" />
          ) : (
            <div className="p-4 rounded-xl bg-[#0c101d] border border-white/5 text-sm sm:text-base font-mono text-emerald-400 break-words font-bold">
              {strVal}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 9. WEBSITE MONITOR
  // -------------------------------------------------------------------
  if (toolId === "website-monitor") {
    const mon = output;
    const isOnline = mon.isUp !== false && mon.status < 400;

    return (
      <div className="space-y-5">
        {/* Status Hero Card */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            isOnline
              ? "bg-gradient-to-br from-emerald-950/40 via-[#0c1427] to-[#111827] border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
              : "bg-gradient-to-br from-red-950/40 via-[#0c1427] to-[#111827] border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <span
                className={`w-3.5 h-3.5 rounded-full animate-ping ${
                  isOnline ? "bg-emerald-400 shadow-[0_0_12px_#10B981]" : "bg-red-500 shadow-[0_0_12px_#EF4444]"
                }`}
              />
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>{mon.health || (isOnline ? "Situs Beroperasi Normal" : "Situs Mengalami Gangguan")}</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono truncate max-w-sm mt-0.5">
                  {mon.finalUrl || mon.targetUrl}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-xl text-sm font-mono font-extrabold border ${
                  isOnline
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-red-500/20 text-red-300 border-red-500/40"
                }`}
              >
                HTTP {mon.status} {mon.statusText}
              </span>
            </div>
          </div>
        </div>

        {/* Latency & Server Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricPill label="Latensi Server" value={`${mon.latencyMs || 0} ms`} icon={Clock} variant="cyan" />
          <MetricPill label="Server Software" value={mon.serverHeader || "Hidden"} variant="gray" />
          <MetricPill label="Konten MIME" value={mon.contentType?.split(";")[0] || "text/html"} variant="gray" />
          <MetricPill label="Diperiksa Pada" value={new Date(mon.checkedAt).toLocaleTimeString()} variant="purple" />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 10. API DATA FETCHER
  // -------------------------------------------------------------------
  if (toolId === "api-data-fetcher") {
    const isJson = typeof output === "object";
    const str = isJson ? JSON.stringify(output, null, 2) : String(output);

    return (
      <div className="space-y-4">
        {metadata && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              HTTP {metadata.status} {metadata.statusText}
            </span>
          </div>
        )}
        <VisualCodeBlock code={str} language={isJson ? "json" : "text"} title="Response Payload" />
      </div>
    );
  }

  // Fallback generic structured renderer
  return <VisualCodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
};
