import { ToolDefinition } from "../types";

export const scraperTools: ToolDefinition[] = [
  {
    id: "web-scraper",
    name: "Web Scraper",
    description: "Ekstraksi data teks spesifik dari situs web manapun menggunakan selector CSS.",
    longDescription:
      "Mengunduh dokumen HTML dari URL target di server dan membedahnya secara presisi menggunakan parser Cheerio.",
    categoryId: "scraper",
    iconName: "Globe",
    status: "popular",
    badge: "Cheerio",
    tags: ["Scraper", "HTML", "CSSSelector", "DataExtract"],
    inputs: [
      {
        id: "url",
        label: "URL Target Website",
        type: "text",
        placeholder: "https://example.com/komik/daftar",
        required: true,
      },
      {
        id: "selector",
        label: "CSS Selector Target",
        type: "text",
        defaultValue: "h1, h2, .title, article",
        placeholder: "Contoh: .title, article p, h1",
      },
    ],
    outputType: "json",
  },
  {
    id: "website-data-extractor",
    name: "Website Data Extractor",
    description: "Ekstrak struktur tabel, paragraf, dan daftar isi dari halaman web secara otomatis.",
    longDescription:
      "Menganalisis arsitektur DOM website untuk mengekstrak data teks terstruktur.",
    categoryId: "scraper",
    iconName: "Table",
    status: "ready",
    tags: ["Structure", "DOM", "Extractor", "Table"],
    inputs: [
      {
        id: "url",
        label: "URL Halaman Web",
        type: "text",
        placeholder: "https://example.com/data",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "image-scraper",
    name: "Image Scraper",
    description: "Kumpulkan semua tautan gambar (img src, data-src) dari sebuah halaman web.",
    longDescription:
      "Memindai seluruh tag img pada halaman HTML target dan menyelesaikan URL relatif menjadi tautan absolut.",
    categoryId: "scraper",
    iconName: "Image",
    status: "ready",
    tags: ["Images", "Gallery", "Crawler", "AssetFinder"],
    inputs: [
      {
        id: "url",
        label: "URL Halaman Web",
        type: "text",
        placeholder: "https://example.com/gallery",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "metadata-scraper",
    name: "Metadata Scraper",
    description: "Ekstrak tag Open Graph, Twitter Card, SEO Title, dan Favicon dari situs manapun.",
    longDescription:
      "Membaca meta tag kepala dokumen HTML untuk mendapatkan judul sosial, deskripsi, gambar kartu, dan canonical link.",
    categoryId: "scraper",
    iconName: "Tag",
    status: "popular",
    badge: "SEO",
    tags: ["SEO", "OpenGraph", "TwitterCards", "Metadata"],
    inputs: [
      {
        id: "url",
        label: "URL Website",
        type: "text",
        placeholder: "https://voidverse.my.id",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "article-extractor",
    name: "Article Extractor",
    description: "Ekstrak teks artikel bersih bebas iklan, navigasi, dan elemen sidebar.",
    longDescription:
      "Membersihkan noise halaman web (iklan, header, footer, skrip) dan menyajikan isi naskah utama yang mudah dibaca.",
    categoryId: "scraper",
    iconName: "FileText",
    status: "ready",
    tags: ["ReaderMode", "Article", "CleanText", "Content"],
    inputs: [
      {
        id: "url",
        label: "URL Artikel Berita / Blog",
        type: "text",
        placeholder: "https://example.com/news/article-1",
        required: true,
      },
    ],
    outputType: "text",
  },
  {
    id: "rss-feed-reader",
    name: "RSS Feed Reader",
    description: "Baca dan uraikan feed RSS atau Atom XML dari portal berita atau situs komik.",
    longDescription:
      "Parser XML real-time untuk feed berita, rilis bab terbaru, atau pembaruan sindikasi web.",
    categoryId: "scraper",
    iconName: "Rss",
    status: "popular",
    badge: "XML",
    tags: ["RSS", "Atom", "Feed", "Syndication"],
    inputs: [
      {
        id: "feedUrl",
        label: "URL Feed RSS / Atom",
        type: "text",
        placeholder: "https://news.ycombinator.com/rss atau https://example.com/feed.xml",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "api-data-fetcher",
    name: "API Data Fetcher",
    description: "Uji dan ambil data dari endpoint REST API dengan header dan query khusus.",
    longDescription:
      "Melakukan HTTP request dari server-side VoidVerse untuk membypass kendala CORS browser.",
    categoryId: "scraper",
    iconName: "Webhook",
    status: "ready",
    tags: ["REST", "API", "HTTP", "Fetch"],
    inputs: [
      {
        id: "url",
        label: "Endpoint URL",
        type: "text",
        placeholder: "https://api.github.com/zen",
        required: true,
      },
      {
        id: "method",
        label: "HTTP Method",
        type: "select",
        defaultValue: "GET",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
        ],
      },
    ],
    outputType: "json",
  },
  {
    id: "json-data-extractor",
    name: "JSON Data Extractor",
    description: "Ekstrak field spesifik atau array tertentu dari payload JSON mentah.",
    longDescription:
      "Menyaring dan memfilter objek JSON berdasarkan path properti tanpa perlu skrip manual.",
    categoryId: "scraper",
    iconName: "FileCode",
    status: "ready",
    tags: ["JSON", "JSONPath", "Filter", "Data"],
    inputs: [
      {
        id: "jsonInput",
        label: "Raw JSON",
        type: "textarea",
        placeholder: '{"data": [{"title": "Manga A", "id": 1}]}',
        required: true,
      },
      {
        id: "keyPath",
        label: "Key Path (Opsional)",
        type: "text",
        placeholder: "data atau data.0.title",
      },
    ],
    outputType: "json",
    clientExecute: (params) => {
      const raw = params.jsonInput;
      if (!raw || typeof raw !== "string" || !raw.trim()) {
        return { success: false, error: "Raw JSON tidak boleh kosong.", errorCode: "INVALID_INPUT" };
      }
      try {
        const obj = JSON.parse(raw);
        if (!params.keyPath || !String(params.keyPath).trim()) {
          return { success: true, output: obj, outputType: "json" };
        }
        const parts = String(params.keyPath).trim().split(".").map((s) => s.trim()).filter(Boolean);
        let curr = obj;
        for (const p of parts) {
          if (curr && typeof curr === "object" && p in curr) {
            curr = curr[p];
          } else {
            return {
              success: false,
              error: `Key path '${params.keyPath}' tidak ditemukan dalam struktur JSON.`,
              errorCode: "NO_DATA",
            };
          }
        }
        return { success: true, output: curr, outputType: "json", metadata: { keyPath: params.keyPath } };
      } catch (err: any) {
        return { success: false, error: `JSON tidak valid: ${err.message}`, errorCode: "PARSE_ERROR" };
      }
    },
  },
  {
    id: "link-extractor",
    name: "Link Extractor",
    description: "Kumpulkan semua tautan internal dan eksternal (a href) dari sebuah website.",
    longDescription:
      "Menganalisis seluruh hyperlink halaman web dan memisahkannya antara domain yang sama dan tautan luar.",
    categoryId: "scraper",
    iconName: "Link2",
    status: "ready",
    tags: ["Links", "Crawler", "Internal", "External"],
    inputs: [
      {
        id: "url",
        label: "URL Halaman Web",
        type: "text",
        placeholder: "https://example.com",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "website-monitor",
    name: "Website Monitor",
    description: "Periksa status uptime, kode respon HTTP, dan latensi ping server secara real-time.",
    longDescription:
      "Melakukan probe status server untuk mendeteksi apakah website sedang online dan mengukur kecepatan responsnya.",
    categoryId: "scraper",
    iconName: "Activity",
    status: "popular",
    badge: "Ping",
    tags: ["Monitor", "Uptime", "Ping", "Status", "Latency"],
    inputs: [
      {
        id: "url",
        label: "URL Website yang Dipantau",
        type: "text",
        placeholder: "https://voidverse.my.id",
        required: true,
      },
    ],
    outputType: "json",
  },
];
