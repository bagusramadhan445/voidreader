import { ToolDefinition } from "../types";

export const forgeTools: ToolDefinition[] = [
  {
    id: "image-compressor",
    name: "Image Compressor",
    description: "Kompresi ukuran file gambar tanpa mengurangi kualitas visual secara drastis.",
    longDescription:
      "Menganalisis dan mengompres foto cover dan panel manga hingga 80% lebih hemat ukuran.",
    categoryId: "forge",
    iconName: "FileArchive",
    status: "popular",
    badge: "WebP / JPEG",
    tags: ["Image", "Compress", "WebP", "Optimization"],
    inputs: [
      {
        id: "sourceUrl",
        label: "URL Gambar atau Data URI",
        type: "text",
        placeholder: "https://... atau data:image/...",
        defaultValue: "https://placehold.co/800x1200/png",
        required: true,
      },
      {
        id: "quality",
        label: "Tingkat Kualitas Kompresi",
        type: "select",
        defaultValue: "0.8",
        options: [
          { label: "Optimal (Kualitas 80% - Hemat 60%)", value: "0.8" },
          { label: "Medium (Kualitas 60% - Hemat 75%)", value: "0.6" },
          { label: "Ekstrem (Kualitas 40% - Hemat 85%)", value: "0.4" },
        ],
      },
    ],
    outputType: "json",
  },
  {
    id: "image-converter",
    name: "Image Converter",
    description: "Konversi format gambar antara WebP, PNG, JPEG, SVG, dan AVIF secara instan.",
    longDescription:
      "Alat pengubah format grafis untuk interoperabilitas web modern dan pengurangan waktu muat halaman.",
    categoryId: "forge",
    iconName: "RefreshCw",
    status: "ready",
    tags: ["Format", "Convert", "PNG", "WebP", "JPEG"],
    inputs: [
      {
        id: "imageUrl",
        label: "URL Gambar Sasaran",
        type: "text",
        placeholder: "https://...",
        defaultValue: "https://placehold.co/600x800/png",
        required: true,
      },
      {
        id: "targetFormat",
        label: "Format Tujuan",
        type: "select",
        defaultValue: "webp",
        options: [
          { label: "WebP (Sangat Cepat & Modern)", value: "webp" },
          { label: "PNG (Transparan Tanpa Kompresi)", value: "png" },
          { label: "JPEG (Kompatibilitas Luas)", value: "jpeg" },
        ],
      },
    ],
    outputType: "json",
  },
  {
    id: "image-upscaler",
    name: "Image Upscaler",
    description: "Tingkatkan resolusi gambar 2x hingga 4x dengan model super-resolusi Real-ESRGAN.",
    longDescription:
      "Perbesar resolusi panel komik beresolusi rendah menjadi tajam dan jernih menggunakan Replicate Real-ESRGAN.",
    categoryId: "forge",
    iconName: "Maximize",
    status: "api-required",
    badge: "Replicate",
    tags: ["Upscale", "Resolution", "Sharpen", "SuperRes"],
    requiresApiKey: "replicate",
    inputs: [
      {
        id: "imageUrl",
        label: "URL Gambar",
        type: "text",
        placeholder: "https://example.com/panel.jpg",
        required: true,
      },
    ],
    outputType: "image",
  },
  {
    id: "background-remover",
    name: "Background Remover",
    description: "Hapus latar belakang gambar dan buat transparan (PNG cutout) untuk karakter anime/manga.",
    longDescription:
      "Pisahkan karakter utama dari background gambar menggunakan Remove.bg atau Replicate Rembg.",
    categoryId: "forge",
    iconName: "Scissors",
    status: "api-required",
    badge: "Remove.bg",
    tags: ["Cutout", "Transparent", "RemoveBG", "PNG"],
    requiresApiKey: "replicate",
    inputs: [
      {
        id: "imageUrl",
        label: "URL Gambar Objek / Karakter",
        type: "text",
        placeholder: "https://example.com/character.png",
        required: true,
      },
    ],
    outputType: "image",
  },
  {
    id: "image-resizer",
    name: "Image Resizer",
    description: "Ubah dimensi lebar dan tinggi gambar dengan menjaga rasio aspek (aspect ratio lock).",
    longDescription:
      "Sesuaikan ukuran poster manga agar cocok untuk thumbnail, wallpaper ponsel, atau avatar profil.",
    categoryId: "forge",
    iconName: "Scaling",
    status: "ready",
    tags: ["Resize", "Dimensions", "AspectRatio", "Crop"],
    inputs: [
      {
        id: "sourceUrl",
        label: "URL Gambar",
        type: "text",
        placeholder: "https://...",
        defaultValue: "https://placehold.co/800x1200/png",
        required: true,
      },
      {
        id: "targetWidth",
        label: "Lebar Target (px)",
        type: "number",
        defaultValue: 600,
        required: true,
      },
      {
        id: "targetHeight",
        label: "Tinggi Target (px)",
        type: "number",
        defaultValue: 800,
        required: true,
      },
      {
        id: "lockRatio",
        label: "Kunci Rasio Aspek",
        type: "select",
        defaultValue: "yes",
        options: [
          { label: "Ya (Pertahankan Rasio)", value: "yes" },
          { label: "Tidak (Bebas / Stretch)", value: "no" },
        ],
      },
    ],
    outputType: "json",
  },
  {
    id: "image-cropper",
    name: "Image Cropper",
    description: "Potong area gambar dengan preset rasio avatar (1:1), banner (16:9), atau komik (3:4).",
    longDescription:
      "Alat pemotong gambar interaktif dengan kisi framing untuk memusatkan fokus visual.",
    categoryId: "forge",
    iconName: "Crop",
    status: "ready",
    tags: ["Crop", "Frame", "Avatar", "Banner"],
    inputs: [
      {
        id: "sourceUrl",
        label: "URL Gambar",
        type: "text",
        placeholder: "https://...",
        defaultValue: "https://placehold.co/800x1200/png",
        required: true,
      },
      {
        id: "cropPreset",
        label: "Preset Rasio Pemotongan",
        type: "select",
        defaultValue: "1:1",
        options: [
          { label: "1:1 Persegi (Avatar Profil)", value: "1:1" },
          { label: "3:4 Vertikal (Cover Manga)", value: "3:4" },
          { label: "16:9 Landscape (Banner Website)", value: "16:9" },
        ],
      },
    ],
    outputType: "json",
  },
  {
    id: "image-color-extractor",
    name: "Image Color Extractor",
    description: "Ekstrak palet warna dominan (HEX, RGB) dari ilustrasi atau cover komik.",
    longDescription:
      "Menganalisis spektrum warna utama gambar untuk dijadikan tema UI warna atau referensi ilustrasi.",
    categoryId: "forge",
    iconName: "Pipette",
    status: "popular",
    badge: "Palette",
    tags: ["Palette", "Colors", "HEX", "RGB", "Extract"],
    inputs: [
      {
        id: "imageUrl",
        label: "URL Gambar untuk Dianalisis",
        type: "text",
        placeholder: "https://...",
        defaultValue: "https://placehold.co/400x400/png",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "image-metadata-viewer",
    name: "Image Metadata Viewer",
    description: "Lihat data EXIF kamera, dimensi piksel asli, color profile, dan format kompresi.",
    longDescription:
      "Inspeksi mendalam informasi teknis yang tersimpan di dalam berkas gambar JPEG/PNG/WebP/GIF.",
    categoryId: "forge",
    iconName: "Info",
    status: "popular",
    badge: "Binary EXIF",
    tags: ["EXIF", "Metadata", "Camera", "ColorProfile", "MagicBytes"],
    inputs: [
      {
        id: "sourceUrl",
        label: "URL Berkas Gambar atau Data URI",
        type: "text",
        placeholder: "https://... atau data:image/...",
        defaultValue: "https://placehold.co/600x800/png",
        required: true,
      },
    ],
    outputType: "json",
  },
  {
    id: "screenshot-analyzer",
    name: "Screenshot Analyzer",
    description: "Deteksi teks (OCR) dan komponen antarmuka dari tangkapan layar panel komik.",
    longDescription:
      "Analisis screenshot panel manga untuk mengenali balon percakapan dan mengekstrak teks dialog di dalamnya.",
    categoryId: "forge",
    iconName: "ScanLine",
    status: "api-required",
    badge: "Vision AI",
    tags: ["OCR", "Screenshot", "TextDetect", "Balloons"],
    requiresApiKey: "gemini",
    inputs: [
      {
        id: "imageUrl",
        label: "URL Screenshot Panel",
        type: "text",
        placeholder: "https://...",
        required: true,
      },
    ],
    outputType: "text",
  },
  {
    id: "qr-code-generator",
    name: "QR Code Generator",
    description: "Buat kode QR beresolusi tinggi dengan warna kustom, tema gelap, atau aksen neon cyan.",
    longDescription:
      "Hasilkan kode QR instan untuk link baca komik, URL profil pembaca, atau teks rahasia.",
    categoryId: "forge",
    iconName: "QrCode",
    status: "popular",
    badge: "Vector / SVG",
    tags: ["QRCode", "SVG", "Scanner", "NeonCode"],
    inputs: [
      {
        id: "content",
        label: "Teks atau Tautan URL",
        type: "text",
        defaultValue: "https://voidverse.my.id",
        required: true,
      },
      {
        id: "colorScheme",
        label: "Skema Warna QR",
        type: "select",
        defaultValue: "cyan",
        options: [
          { label: "Void Cyan (#00E5FF di atas Gelap)", value: "cyan" },
          { label: "Klasik Hitam Putih", value: "black" },
          { label: "Neon Purple (#A855F7)", value: "purple" },
        ],
      },
    ],
    outputType: "image",
    clientExecute: async (params) => {
      const content = String(params.content || "").trim();
      if (!content) {
        return { success: false, error: "Konten teks atau URL QR tidak boleh kosong.", errorCode: "INVALID_INPUT" };
      }
      const encoded = encodeURIComponent(content);
      const color = params.colorScheme === "cyan" ? "00E5FF" : params.colorScheme === "purple" ? "A855F7" : "000000";
      const bgcolor = params.colorScheme === "black" ? "FFFFFF" : "080B14";
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encoded}&color=${color}&bgcolor=${bgcolor}`;

      return {
        success: true,
        output: qrUrl,
        outputType: "image",
        errorCode: "SUCCESS",
        metadata: { downloadUrl: qrUrl, downloadFileName: "void_qrcode.png" },
      };
    },
  },
];
