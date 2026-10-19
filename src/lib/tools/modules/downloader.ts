import { ToolDefinition } from "../types";

export const downloaderTools: ToolDefinition[] = [
  {
    id: "video-downloader",
    name: "Video Downloader",
    description: "Unduh video MP4 & audio dari YouTube, TikTok (Tanpa Watermark), Instagram Reels, SnackVideo, dan direct stream.",
    longDescription:
      "Engine pengunduh video multifungsi yang terhubung langsung ke Downloader Provider Manager backend. Cukup tempelkan tautan video dari YouTube, TikTok, Instagram, atau SnackVideo untuk mendapatkan tautan unduh instan.",
    categoryId: "downloader",
    iconName: "Video",
    status: "popular",
    badge: "Universal",
    tags: ["Video", "YouTube", "TikTok", "Instagram", "SnackVideo", "MP4"],
    inputs: [
      {
        id: "url",
        label: "URL Video / Konten",
        type: "text",
        placeholder: "Tempel URL YouTube, TikTok, Instagram Reel, atau SnackVideo...",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "image-downloader",
    name: "Image Downloader",
    description: "Unduh gambar resolusi penuh dengan otomatis mem-bypass pembatasan referrer/hotlink.",
    longDescription:
      "Mengekstrak informasi ukuran asli, tipe berkas, dan tautan unduhan langsung tanpa watermark kompresi.",
    categoryId: "downloader",
    iconName: "Image",
    status: "ready",
    tags: ["Image", "HD", "Cover", "Bypass"],
    inputs: [
      {
        id: "url",
        label: "URL Gambar Asli / Halaman Web / Multi-URL",
        type: "textarea",
        placeholder: "Tempelkan tautan gambar (.jpg, .png), URL halaman web untuk ekstraksi massal, atau daftar tautan gambar...",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "manga-downloader",
    name: "Manga Downloader",
    description: "Cari manga, ekstrak antrean halaman gambar, dan buat arsip unduhan ZIP/CBZ/PDF per chapter.",
    longDescription:
      "Engine pengunduh manga terpadu yang mengekstrak seluruh halaman gambar chapter manga dan mengompresnya ke dalam format arsip ZIP, Comic Book Zip (CBZ), atau dokumen bacaan PDF.",
    categoryId: "downloader",
    iconName: "BookOpen",
    status: "popular",
    badge: "Multi-Source",
    tags: ["Manga", "Chapters", "ZIP", "CBZ", "PDF", "Archive"],
    inputs: [
      {
        id: "title",
        label: "Judul Manga / Slug / URL Chapter",
        type: "text",
        placeholder: "Contoh: Solo Leveling, One Piece, atau tempel link chapter...",
        required: true,
      },
      {
        id: "chapter",
        label: "Nomor / Judul Chapter (Opsional)",
        type: "text",
        placeholder: "Contoh: 1, 179, latest (kosongkan untuk chapter terbaru)",
        required: false,
      },
    ],
    outputType: "json",
  },
  {
    id: "comic-downloader",
    name: "Comic Downloader",
    description: "Unduh strip komik & webtoon lengkap dengan generator arsip ZIP, CBZ, dan PDF.",
    longDescription:
      "Mengambil seluruh halaman komik webtoon berkualitas tinggi langsung dari sumbernya dan menyiapkannya ke dalam format ZIP, CBZ untuk aplikasi pembaca komik, dan PDF dokumen.",
    categoryId: "downloader",
    iconName: "Layers",
    status: "ready",
    badge: "Webtoon/Comic",
    tags: ["Webtoon", "Comic", "Strip", "ZIP", "CBZ", "PDF"],
    inputs: [
      {
        id: "title",
        label: "Judul Komik / Webtoon / URL Chapter",
        type: "text",
        placeholder: "Contoh: Omniscient Reader, Eleceed, Tower of God...",
        required: true,
      },
      {
        id: "chapter",
        label: "Nomor Chapter (Opsional)",
        type: "text",
        placeholder: "Contoh: 1, 50 (kosongkan untuk chapter terbaru)",
        required: false,
      },
    ],
    outputType: "json",
  },
  {
    id: "file-downloader",
    name: "File Downloader",
    description: "Inspeksi header unduhan berkas, ukuran file asli, dan dukungan resume.",
    longDescription:
      "Melakukan probe HTTP HEAD/GET untuk memverifikasi apakah server mendukung resumable download (Accept-Ranges) dan ukuran file akurat.",
    categoryId: "downloader",
    iconName: "FileDown",
    status: "ready",
    tags: ["File", "Direct", "Resumable", "Inspector"],
    inputs: [
      {
        id: "url",
        label: "URL Berkas",
        type: "text",
        placeholder: "https://example.com/archive.zip",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "batch-downloader",
    name: "Batch Downloader",
    description: "Inspeksi massal status ketersediaan dan ukuran puluhan URL berkas sekaligus.",
    longDescription:
      "Memeriksa status HTTP, ukuran byte, dan tipe konten untuk beberapa tautan secara paralel.",
    categoryId: "downloader",
    iconName: "ListChecks",
    status: "ready",
    tags: ["Batch", "MultiURL", "Inspector", "Bulk"],
    inputs: [
      {
        id: "urls",
        label: "Daftar URL (Satu per baris)",
        type: "textarea",
        placeholder: "https://example.com/file1.jpg\nhttps://example.com/file2.zip",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "cloud-downloader",
    name: "Cloud Downloader",
    description: "Konversi dan unduh berkas langsung dari penyimpanan cloud Terabox berkecepatan tinggi.",
    longDescription:
      "Menghubungkan ke Terabox Resolver API di server untuk mengubah tautan share Terabox menjadi tautan unduhan langsung tanpa limit aplikasi.",
    categoryId: "downloader",
    iconName: "CloudDownload",
    status: "ready",
    badge: "Terabox",
    tags: ["Cloud", "Terabox", "Storage", "Drive", "Direct"],
    inputs: [
      {
        id: "url",
        label: "Tautan Berkas Terabox",
        type: "text",
        placeholder: "https://terabox.com/s/... atau https://1024tera.com/s/...",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "url-download-manager",
    name: "URL Download Manager",
    description: "Penganalisis properti unduhan URL lengkap sebelum mengunduh berkas besar.",
    longDescription:
      "Mendeteksi tipe MIME, final redirect URL, header nama file, dan perkiraan byte.",
    categoryId: "downloader",
    iconName: "Download",
    status: "ready",
    tags: ["URL", "Manager", "Inspector", "Network"],
    inputs: [
      {
        id: "url",
        label: "Target URL",
        type: "text",
        placeholder: "https://example.com/download/asset",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "download-history-manager",
    name: "Download History Manager",
    description: "Kelola riwayat unduhan lokal, bersihkan cache berkas, dan ekspor log.",
    longDescription:
      "Menampilkan ringkasan riwayat unduhan pada browser lokal dengan opsi pembersihan cepat.",
    categoryId: "downloader",
    iconName: "History",
    status: "ready",
    tags: ["History", "Manager", "Local", "Cleanup"],
    inputs: [],
    outputType: "json",
    clientExecute: () => {
      return {
        success: true,
        output: {
          status: "Penyimpanan Bersih",
          activeSessions: 0,
          cachedFilesCount: 0,
          note: "Semua unduhan pada sesi browser saat ini berjalan langsung tanpa file residu server.",
        },
        outputType: "json",
      };
    },
  },
  {
    id: "media-downloader-manager",
    name: "Media Downloader Manager",
    description: "Inspektur terpadu seluruh stream media gambar, audio, dan video dalam satu halaman.",
    longDescription:
      "Memindai halaman web untuk menemukan stream video tersemat, audio player, dan aset visual.",
    categoryId: "downloader",
    iconName: "FolderDown",
    status: "popular",
    badge: "Universal",
    tags: ["Media", "Universal", "Stream", "Extract"],
    inputs: [
      {
        id: "url",
        label: "URL Halaman Media",
        type: "text",
        placeholder: "https://example.com/media-page",
        required: true,
      },
    ],
    outputType: "json",
  },
];
