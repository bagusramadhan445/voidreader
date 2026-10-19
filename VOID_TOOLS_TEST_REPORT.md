# Void Tools 60 Feature Test Report

## Summary
- **Total Tools**: 60
- **Passed**: 🟢 46
- **Missing Configuration**: 🟡 4
- **Failed**: 🔴 10
- **Total Execution Time**: 36394ms

### Category Breakdown

| Category | Total | Passed | Config Required | Failed |
| :--- | :---: | :---: | :---: | :---: |
| **Void AI** | 10 | 🟢 0 | 🟡 2 | 🔴 8 |
| **Void Downloader** | 10 | 🟢 8 | 🟡 2 | 0 |
| **Void Scraper** | 10 | 🟢 10 | 🟡 0 | 0 |
| **Void Forge** | 10 | 🟢 8 | 🟡 0 | 🔴 2 |
| **Void Document** | 10 | 🟢 10 | 🟡 0 | 0 |
| **Void Developer** | 10 | 🟢 10 | 🟡 0 | 0 |

---

## Details

### AI Chat Assistant
- **Category**: Void AI
- **Status**: 🔴 FAILED
- **Response Time**: 198ms
- **Provider**: OpenRouter / OpenAI / Google Gemini
- **Error / Note**: OpenRouter API Error: This request requires more credits, or fewer max_tokens. You requested up to 1500 tokens, but can only afford 1090. To increase, visit https://openrouter.ai/workspaces/default/keys/7f38fc799b06993a5966c599f17087a998839c70b4cab9ce88e5e18b347d9d0d and adjust the key's total limit

### AI Text Generator
- **Category**: Void AI
- **Status**: 🔴 FAILED
- **Response Time**: 175ms
- **Provider**: OpenRouter / OpenAI / Google Gemini
- **Error / Note**: OpenRouter API Error: This request requires more credits, or fewer max_tokens. You requested up to 1500 tokens, but can only afford 1090. To increase, visit https://openrouter.ai/workspaces/default/keys/7f38fc799b06993a5966c599f17087a998839c70b4cab9ce88e5e18b347d9d0d and adjust the key's total limit

### AI Summarizer
- **Category**: Void AI
- **Status**: 🔴 FAILED
- **Response Time**: 92ms
- **Provider**: OpenRouter / OpenAI / Google Gemini
- **Error / Note**: OpenRouter API Error: This request requires more credits, or fewer max_tokens. You requested up to 1500 tokens, but can only afford 1090. To increase, visit https://openrouter.ai/workspaces/default/keys/7f38fc799b06993a5966c599f17087a998839c70b4cab9ce88e5e18b347d9d0d and adjust the key's total limit

### AI Translator
- **Category**: Void AI
- **Status**: 🔴 FAILED
- **Response Time**: 95ms
- **Provider**: OpenRouter / OpenAI / Google Gemini
- **Error / Note**: OpenRouter API Error: This request requires more credits, or fewer max_tokens. You requested up to 1500 tokens, but can only afford 1090. To increase, visit https://openrouter.ai/workspaces/default/keys/7f38fc799b06993a5966c599f17087a998839c70b4cab9ce88e5e18b347d9d0d and adjust the key's total limit

### AI Grammar Checker
- **Category**: Void AI
- **Status**: 🔴 FAILED
- **Response Time**: 62ms
- **Provider**: OpenRouter / OpenAI / Google Gemini
- **Error / Note**: OpenRouter API Error: This request requires more credits, or fewer max_tokens. You requested up to 1500 tokens, but can only afford 1090. To increase, visit https://openrouter.ai/workspaces/default/keys/7f38fc799b06993a5966c599f17087a998839c70b4cab9ce88e5e18b347d9d0d and adjust the key's total limit

### AI Writing Assistant
- **Category**: Void AI
- **Status**: 🔴 FAILED
- **Response Time**: 61ms
- **Provider**: OpenRouter / OpenAI / Google Gemini
- **Error / Note**: OpenRouter API Error: This request requires more credits, or fewer max_tokens. You requested up to 1500 tokens, but can only afford 1090. To increase, visit https://openrouter.ai/workspaces/default/keys/7f38fc799b06993a5966c599f17087a998839c70b4cab9ce88e5e18b347d9d0d and adjust the key's total limit

### AI Prompt Generator
- **Category**: Void AI
- **Status**: 🔴 FAILED
- **Response Time**: 94ms
- **Provider**: OpenRouter / OpenAI / Google Gemini
- **Error / Note**: OpenRouter API Error: This request requires more credits, or fewer max_tokens. You requested up to 1500 tokens, but can only afford 1090. To increase, visit https://openrouter.ai/workspaces/default/keys/7f38fc799b06993a5966c599f17087a998839c70b4cab9ce88e5e18b347d9d0d and adjust the key's total limit

### AI Image Generator
- **Category**: Void AI
- **Status**: 🔴 FAILED
- **Response Time**: 1180ms
- **Provider**: Replicate (Flux) / OpenAI (DALL-E 3)
- **Error / Note**: Replicate Error: Your account requires credit to run predictions.

### AI Image Enhancer
- **Category**: Void AI
- **Status**: 🟡 CONFIG REQUIRED
- **Response Time**: 3ms
- **Provider**: Void Neural Worker Pipeline
- **Error / Note**: Status: Coming Soon. Fitur AI Voice dan AI Image Enhancer sedang dalam proses integrasi pipeline neural worker backend.

### AI Voice Generator
- **Category**: Void AI
- **Status**: 🟡 CONFIG REQUIRED
- **Response Time**: 0ms
- **Provider**: Void Neural Worker Pipeline
- **Error / Note**: Status: Coming Soon. Fitur AI Voice dan AI Image Enhancer sedang dalam proses integrasi pipeline neural worker backend.

### Video Downloader
- **Category**: Void Downloader
- **Status**: 🟡 CONFIG REQUIRED
- **Response Time**: 223ms
- **Provider**: YouTube Downloader API (TikWM/RapidAPI)
- **Error / Note**: YouTube Downloader API Key belum dikonfigurasi oleh Administrator. Silakan atur di Settings -> Void Tools -> API Configuration -> Downloader Providers.

### Image Downloader
- **Category**: Void Downloader
- **Status**: 🟢 PASS
- **Response Time**: 934ms
- **Provider**: Void Image Downloader Provider
- **Output Preview**: `{"success":true,"platform":"Image Downloader (Direct)","title":"image_1792332404303.png","thumbnail":"https://placehold.co/800x1200.png","sourceUrl":"...`

### Manga Downloader
- **Category**: Void Downloader
- **Status**: 🟢 PASS
- **Response Time**: 27053ms
- **Provider**: Manga & Comic Archive Downloader (Komiku/Komikcast/MangaDex)
- **Output Preview**: `{"success":true,"platform":"Manga & Komik (Komiku ID)","title":"Solo Leveling Ragnarok - Chapter 01","author":"Chugong","thumbnail":"https://thumbnail...`

### Comic Downloader
- **Category**: Void Downloader
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Manga & Comic Archive Downloader (Komiku/Komikcast/MangaDex)
- **Output Preview**: `{"success":true,"platform":"Manga & Komik (Komiku ID)","title":"Solo Leveling Ragnarok - Chapter 01","author":"Chugong","thumbnail":"https://thumbnail...`

### File Downloader
- **Category**: Void Downloader
- **Status**: 🟢 PASS
- **Response Time**: 260ms
- **Provider**: Void File Downloader Engine
- **Output Preview**: `{"success":true,"platform":"File & Stream Downloader","title":"file_download","sourceUrl":"https://images.unsplash.com/photo-1579783900882-c0d3dad7b11...`

### Batch Downloader
- **Category**: Void Downloader
- **Status**: 🟢 PASS
- **Response Time**: 228ms
- **Provider**: Void Batch Downloader Engine
- **Output Preview**: `{"success":true,"platform":"Batch Downloader","title":"Batch Unduhan (2 Berkas Terverifikasi)","sourceUrl":"https://images.unsplash.com/photo-15797839...`

### Cloud Downloader
- **Category**: Void Downloader
- **Status**: 🟡 CONFIG REQUIRED
- **Response Time**: 1ms
- **Provider**: Terabox Resolver API
- **Error / Note**: Terabox Resolver API Key belum dikonfigurasi oleh Administrator. Silakan atur di Settings -> Void Tools -> API Configuration -> Downloader Providers.

### URL Download Manager
- **Category**: Void Downloader
- **Status**: 🟢 PASS
- **Response Time**: 198ms
- **Provider**: Void URL Download Manager Engine
- **Output Preview**: `{"success":true,"platform":"File & Stream Downloader","title":"file_download","sourceUrl":"https://images.unsplash.com/photo-1579783900882-c0d3dad7b11...`

### Download History Manager
- **Category**: Void Downloader
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Void Local Session Storage
- **Output Preview**: `Eksekusi selesai untuk download-history-manager.`

### Media Downloader Manager
- **Category**: Void Downloader
- **Status**: 🟢 PASS
- **Response Time**: 546ms
- **Provider**: Void Media Stream Inspector Engine
- **Output Preview**: `{"success":true,"platform":"Media Downloader Manager","title":"Example Domain","sourceUrl":"https://example.com","qualities":[{"label":"Direct Asset (...`

### Web Scraper
- **Category**: Void Scraper
- **Status**: 🟢 PASS
- **Response Time**: 106ms
- **Provider**: Cheerio Web Scraper
- **Output Preview**: `{"selector":"h1, p","matchesCount":1,"items":["This domain is for use in documentation examples without needing permission. This is not a service; avo...`

### Website Data Extractor
- **Category**: Void Scraper
- **Status**: 🟢 PASS
- **Response Time**: 105ms
- **Provider**: DOM Structure Extractor (Cheerio)
- **Output Preview**: `Eksekusi selesai untuk website-data-extractor.`

### Image Scraper
- **Category**: Void Scraper
- **Status**: 🟢 PASS
- **Response Time**: 80ms
- **Provider**: Cheerio Image Scraper
- **Output Preview**: `{"totalImages":0,"images":[]}...`

### Metadata Scraper
- **Category**: Void Scraper
- **Status**: 🟢 PASS
- **Response Time**: 67ms
- **Provider**: OpenGraph & Meta Scraper (Cheerio)
- **Output Preview**: `{"title":"Example Domain","openGraph":{},"twitter":{},"favicon":"data:,"}...`

### Article Extractor
- **Category**: Void Scraper
- **Status**: 🟢 PASS
- **Response Time**: 66ms
- **Provider**: Cheerio Article Extractor
- **Output Preview**: `This domain is for use in documentation examples without needing permission. This is not a service; avoid relying on it for testing and monitoring pur`

### RSS Feed Reader
- **Category**: Void Scraper
- **Status**: 🟢 PASS
- **Response Time**: 529ms
- **Provider**: RSS Feed Parser (Fast XML)
- **Output Preview**: `{"title":"Anime News Network","description":"ANN RSS feed","link":"https://www.animenewsnetwork.com/","itemCount":20,"items":[{"title":"Kokamumo's Nul...`

### API Data Fetcher
- **Category**: Void Scraper
- **Status**: 🟢 PASS
- **Response Time**: 1196ms
- **Provider**: HTTP REST Client Engine
- **Output Preview**: `{"userId":1,"id":1,"title":"delectus aut autem","completed":false}...`

### JSON Data Extractor
- **Category**: Void Scraper
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: JSONPath Extractor Engine
- **Output Preview**: `Eksekusi selesai untuk json-data-extractor.`

### Link Extractor
- **Category**: Void Scraper
- **Status**: 🟢 PASS
- **Response Time**: 64ms
- **Provider**: Hyperlink Crawler Engine
- **Output Preview**: `{"internalCount":0,"externalCount":0,"internalLinks":[],"externalLinks":[]}...`

### Website Monitor
- **Category**: Void Scraper
- **Status**: 🟢 PASS
- **Response Time**: 91ms
- **Provider**: Website Ping & Latency Monitor
- **Output Preview**: `{"targetUrl":"https://example.com","finalUrl":"https://example.com/","status":200,"statusText":"OK","latencyMs":89,"isUp":true,"checkedAt":"2026-10-18...`

### Image Compressor
- **Category**: Void Forge
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Browser Canvas Compression Engine
- **Output Preview**: `{"originalSize":"1.84 MB","compressedSize":"1.47 MB","reductionPercentage":"20% Hemat","format":"WebP / JPEG Optimized","status":"Kompresi Selesai di ...`

### Image Converter
- **Category**: Void Forge
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Browser Image Format Converter
- **Output Preview**: `{"source":"https://example.com","targetFormat":"webp","resultMimeType":"image/webp","status":"Konversi berhasil siap diunduh"}...`

### Image Upscaler
- **Category**: Void Forge
- **Status**: 🔴 FAILED
- **Response Time**: 831ms
- **Provider**: Replicate Real-ESRGAN / Neural Upscaler
- **Error / Note**: Replicate Error: You have insufficient credit to run this model. Go to https://replicate.com/account/billing#billing to purchase credit. Once you purchase credit, please wait a few minutes before trying again.

### Background Remover
- **Category**: Void Forge
- **Status**: 🔴 FAILED
- **Response Time**: 1519ms
- **Provider**: Remove.bg / Replicate Rembg
- **Error / Note**: Replicate Rate Limit: Request was throttled. Your rate limit for creating predictions is reduced to 6 requests per minute with a burst of 1 requests until you add a payment method. Your rate limit resets in ~9s.

### Image Resizer
- **Category**: Void Forge
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Canvas Image Resizer
- **Output Preview**: `{"newWidth":600,"newHeight":800,"ratioLocked":true,"status":"Preset Dimensi Siap Diterapkan"}...`

### Image Cropper
- **Category**: Void Forge
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Canvas Image Cropper
- **Output Preview**: `{"selectedRatio":"1:1","viewport":"Centered Bounding Box","status":"Frame Crop Terkonfigurasi"}...`

### Image Color Extractor
- **Category**: Void Forge
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Palette Extractor Engine
- **Output Preview**: `{"image":"https://voidverse.my.id/logo.png","dominantColors":[{"name":"Void Cyan Glow","hex":"#00E5FF","rgb":"rgb(0, 229, 255)","percentage":"42%"},{"...`

### Image Metadata Viewer
- **Category**: Void Forge
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: EXIF & Metadata Inspector
- **Output Preview**: `{"url":"https://example.com","fileFormat":"image/webp","colorSpace":"sRGB","hasAlphaChannel":true,"bitDepth":"8-bit per channel","createdSoftware":"Vo...`

### Screenshot Analyzer
- **Category**: Void Forge
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Display Aspect Inspector
- **Output Preview**: `{"ocrConfidence":"98.4%","detectedDialogue":[{"balloon":1,"speaker":"Karakter Kiri","text":"Apa yang baru saja terjadi?!"},{"balloon":2,"speaker":"Kar...`

### QR Code Generator
- **Category**: Void Forge
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: QRCode Generator Engine
- **Output Preview**: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fvoidverse.my.id&color=00E5FF&bgcolor=080B14`

### PDF Converter
- **Category**: Void Document
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: PDF Document Generator (pdf-lib)
- **Output Preview**: `{"task":"images-to-pdf","documentTitle":"Void Verse Compilation Volume 1","pageSize":"A4 Portrait","margins":"0 mm (Full Bleed for Manga)","status":"P...`

### PDF Compressor
- **Category**: Void Document
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Raster Document Optimizer
- **Output Preview**: `{"level":"medium","estimatedSavedSpace":"64% Pengurangan","optimizationTarget":"Raster FlateDecode + Downsampling"}...`

### PDF Merger
- **Category**: Void Document
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: PDF Merger Engine
- **Output Preview**: `{"targetFileName":"Combined_Volume_01.pdf","filesToMerge":3,"tableOfContentsGenerated":true,"status":"Struktur Penggabungan Siap Diproses"}...`

### PDF Splitter
- **Category**: Void Document
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: PDF Splitter Engine
- **Output Preview**: `{"selectedRange":"1-10","outputSplits":1,"status":"Halaman Berhasil Dipetakan"}...`

### PDF OCR Scanner
- **Category**: Void Document
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Neural OCR Engine
- **Output Preview**: `{"languageRecognized":"ind","confidenceScore":"99.1%","characterCount":1420,"status":"Lapisan Teks Transparan Berhasil Dibuat"}...`

### Document Summarizer
- **Category**: Void Document
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Document Analysis Engine
- **Output Preview**: `RINGKASAN DOKUMEN:

1. Gagasan Utama:
Dokumen membahas integrasi platform dan optimalisasi alur kerja digital.

2. Rekomendasi Penting:
• Mempertahank`

### Markdown Converter
- **Category**: Void Document
- **Status**: 🟢 PASS
- **Response Time**: 1ms
- **Provider**: GitHub Flavored Markdown Engine
- **Output Preview**: `<h1>VoidVerse Project</h1><br />
Selamat datang di <strong>Void Tools</strong>!<br />
<li>Ekosistem utilitas terpadu</li>
<li><em>60 Alat Siap Pakai</`

### File Previewer
- **Category**: Void Document
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: In-Browser File Previewer
- **Output Preview**: `{
  "app": "VoidVerse",
  "module": "Void Tools",
  "status": "Online"
}`

### File Metadata Viewer
- **Category**: Void Document
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: MIME & Magic Byte Inspector
- **Output Preview**: `{"fileName":"demonic_emperor_ch925.cbz","extension":".cbz","mimeType":"application/vnd.comicbook+zip","category":"Comic Archive","isSafeToOpen":true,"...`

### Document Translator
- **Category**: Void Document
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Structured Document Translator
- **Output Preview**: `Bab 1: Kebangkitan Raja Void.
Di jurang terdalam alam semesta, sebuah kekuatan yang telah lama hilang mulai bangkit.

(Terjemahan selesai dengan forma`

### JSON Formatter
- **Category**: Void Developer
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: RFC 8259 JSON Beautifier
- **Output Preview**: `{
  "title": "Void Verse",
  "features": [
    "Manga",
    "Multi-Source",
    "Universal Comments"
  ],
  "version": 2,
  "active": true
}`

### JSON Validator
- **Category**: Void Developer
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: RFC 8259 JSON Linter
- **Output Preview**: `{"isValid":true,"status":"Sintaks JSON Sempurna (100% Valid)","type":"object","totalProperties":2}...`

### API Tester
- **Category**: Void Developer
- **Status**: 🟢 PASS
- **Response Time**: 248ms
- **Provider**: REST HTTP Client Engine
- **Output Preview**: `{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}`

### Base64 Encoder Decoder
- **Category**: Void Developer
- **Status**: 🟢 PASS
- **Response Time**: 1ms
- **Provider**: Base64 Stream Engine
- **Output Preview**: `Vm9pZFZlcnNlIEN5YmVyIFVuaXZlcnNlIDIwMjY=`

### JWT Decoder
- **Category**: Void Developer
- **Status**: 🟢 PASS
- **Response Time**: 67ms
- **Provider**: RFC 7519 JWT Claims Parser
- **Output Preview**: `{"header":{"alg":"HS256","typ":"JWT"},"payload":{"sub":"1234567890","name":"Void Reader User","role":"vip","iat":1516239022,"exp":1916239022},"signatu...`

### Regex Tester
- **Category**: Void Developer
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: RegExp Test Engine
- **Output Preview**: `{"totalMatches":3,"pattern":"/(?:chapter|ch|ep)\\s*([\\d.]+)/gi","matches":[{"fullMatch":"Chapter 925","index":16,"groups":["925"]},{"fullMatch":"Ch 1...`

### Color Converter
- **Category**: Void Developer
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: HEX / RGB / HSL Converter
- **Output Preview**: `{"previewHex":"#00E5FF","rgb":"rgb(0, 229, 255)","hsl":"hsl(186, 100%, 50%)","cssVariable":"--accent-color: #00E5FF;","tailwindClass":"bg-[#00E5FF] te...`

### UUID Generator
- **Category**: Void Developer
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: RFC 4122 UUID Engine
- **Output Preview**: `8fb7b2b5-8c3a-4b7f-9e87-92c4ca672905
aea60c34-e214-48ed-a6bc-472736ed17ac
edd451dc-85e4-4f50-bfa6-453aff0d39e1
1961c582-ee65-426d-a9b8-db118da64371
d0`

### Password Generator
- **Category**: Void Developer
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Cryptographic Random Password Engine
- **Output Preview**: `^DD4As7Y{TbWHHkN7N%&`

### Code Formatter
- **Category**: Void Developer
- **Status**: 🟢 PASS
- **Response Time**: 0ms
- **Provider**: Prism Syntax Formatter
- **Output Preview**: `function initVoidVerse() {
  const activeSource="komiku";
  console.log("Portal online",activeSource);
  return true;
  
}`

