import { ToolDefinition } from "../types";
import {
  runJsonFormatter,
  runJsonValidator,
  runBase64EncoderDecoder,
  runJwtDecoder,
  runRegexTester,
  runColorConverter,
  runUuidGenerator,
  runPasswordGenerator,
  runCodeFormatter,
} from "./developer-engine";

export const developerTools: ToolDefinition[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format, rapikan (beautify), atau perkecil (minify) data JSON dengan indentasi rapi.",
    longDescription:
      "Alat wajib pengembang untuk memeriksa struktur data JSON respon API, mempercantik objek bersarang, atau mengompresi JSON untuk transmisi cepat.",
    categoryId: "developer",
    iconName: "Braces",
    status: "popular",
    badge: "Active",
    tags: ["JSON", "Beautify", "Minify", "Syntax", "Developer"],
    inputs: [
      {
        id: "rawJson",
        label: "Masukkan Teks JSON",
        type: "textarea",
        defaultValue: `{"title":"Void Verse","features":["Manga","Multi-Source","Universal Comments"],"version":2,"active":true}`,
        required: true,
      },
      {
        id: "indent",
        label: "Spasi Indentasi",
        type: "select",
        defaultValue: "2",
        options: [
          { label: "2 Spasi (Standar Modern)", value: "2" },
          { label: "4 Spasi (Klasik)", value: "4" },
          { label: "Minify (1 Baris Ringkas)", value: "0" },
          { label: "Tab Indent", value: "tab" },
        ],
      },
    ],
    examples: [
      {
        title: "Konfigurasi Objek",
        input: {
          rawJson: `{"appName":"VoidVerse","engine":"Next.js 15","security":{"ssrfProtection":true,"rateLimit":true},"theme":"cyber-dark"}`,
          indent: "2",
        },
      },
      {
        title: "Daftar Array & Minify",
        input: {
          rawJson: `[\n  {"id": 1, "name": "Komiku"},\n  {"id": 2, "name": "MangaDex"},\n  {"id": 3, "name": "Komikcast"}\n]`,
          indent: "0",
        },
      },
    ],
    outputType: "code",
    outputLanguage: "json",
    clientExecute: async (params) => {
      return runJsonFormatter(params.rawJson, params.indent);
    },
  },
  {
    id: "json-validator",
    name: "JSON Validator",
    description: "Validasi kebenaran sintaks JSON dan temukan baris kesalahan secara presisi.",
    longDescription:
      "Mendeteksi tanda koma berlebih, kurung kurawal yang hilang, atau petik ganda yang tidak sesuai standar RFC 8259.",
    categoryId: "developer",
    iconName: "CheckCircle",
    status: "ready",
    tags: ["Validator", "Lint", "SyntaxCheck", "RFC8259"],
    inputs: [
      {
        id: "jsonString",
        label: "JSON untuk Divalidasi",
        type: "textarea",
        defaultValue: `{\n  "status": "valid",\n  "timestamp": 1728567000,\n  "metadata": {\n    "author": "Antigravity",\n    "rfc": "RFC 8259"\n  }\n}`,
        required: true,
      },
    ],
    examples: [
      {
        title: "JSON Valid",
        input: {
          jsonString: `{\n  "source": "komiku",\n  "verified": true,\n  "rating": 4.9\n}`,
        },
      },
      {
        title: "Uji JSON Error",
        input: {
          jsonString: `{\n  "name": "VoidVerse",\n  "trailingComma": true,\n}`,
        },
      },
    ],
    outputType: "json",
    clientExecute: async (params) => {
      return runJsonValidator(params.jsonString);
    },
  },
  {
    id: "api-tester",
    name: "API Tester",
    description: "Uji coba request endpoint REST API (GET, POST, PUT, DELETE, PATCH, Headers, Body) layaknya Postman.",
    longDescription:
      "Alat pengujian HTTP terproteksi SSRF Guard untuk memeriksa latensi respon server, header status, dan response payload.",
    categoryId: "developer",
    iconName: "Send",
    status: "popular",
    badge: "Hot",
    tags: ["Postman", "HTTP", "REST", "Endpoints", "Tester"],
    inputs: [
      {
        id: "url",
        label: "Endpoint URL Target",
        type: "text",
        defaultValue: "https://jsonplaceholder.typicode.com/todos/1",
        placeholder: "https://api.example.com/v1/resource",
        required: true,
      },
      {
        id: "method",
        label: "Metode HTTP",
        type: "select",
        defaultValue: "GET",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "DELETE", value: "DELETE" },
          { label: "PATCH", value: "PATCH" },
          { label: "HEAD", value: "HEAD" },
        ],
      },
      {
        id: "headersJson",
        label: "Headers Kustom (Format JSON)",
        type: "textarea",
        defaultValue: `{\n  "Accept": "application/json",\n  "User-Agent": "VoidVerse-ApiTester/2.0"\n}`,
      },
      {
        id: "body",
        label: "Request Body (Untuk POST/PUT/PATCH)",
        type: "textarea",
        defaultValue: `{\n  "title": "Misi Baru",\n  "completed": false\n}`,
      },
    ],
    examples: [
      {
        title: "GET Request Contoh",
        input: {
          url: "https://jsonplaceholder.typicode.com/posts/1",
          method: "GET",
          headersJson: '{\n  "Accept": "application/json"\n}',
          body: "",
        },
      },
      {
        title: "POST Payload",
        input: {
          url: "https://jsonplaceholder.typicode.com/posts",
          method: "POST",
          headersJson: '{\n  "Content-Type": "application/json"\n}',
          body: '{\n  "title": "Void Verse Post",\n  "userId": 1\n}',
        },
      },
    ],
    outputType: "json",
    clientExecute: async (params) => {
      // API Tester performs network requests and must be routed via the SSRF-guarded server endpoint
      if (typeof window !== "undefined") {
        try {
          const res = await fetch("/api/tools/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toolId: "api-tester",
              params,
            }),
          });
          const data = await res.json();
          return data;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            error: `Gagal mengirim request ke server proxy pengujian API: ${msg}`,
            errorCode: "NETWORK_ERROR",
          };
        }
      }

      return {
        success: false,
        error: "Pengujian API memerlukan server runtime untuk proteksi SSRF.",
        errorCode: "CONFIG_ERROR",
      };
    },
  },
  {
    id: "base64-encoder-decoder",
    name: "Base64 Encoder Decoder",
    description: "Encode teks atau karakter UTF-8 menjadi string Base64 dan decode sebaliknya.",
    longDescription:
      "Alat konversi Base64 dua arah yang mendukung karakter multibyte internasional, emoji, dan opsi format URL-safe.",
    categoryId: "developer",
    iconName: "Binary",
    status: "ready",
    tags: ["Base64", "Encode", "Decode", "Binary", "ASCII", "UTF-8"],
    inputs: [
      {
        id: "action",
        label: "Tindakan",
        type: "select",
        defaultValue: "encode",
        options: [
          { label: "Encode (Teks Biasa ➜ Base64)", value: "encode" },
          { label: "Decode (Base64 ➜ Teks Biasa)", value: "decode" },
        ],
      },
      {
        id: "content",
        label: "Teks Masukan",
        type: "textarea",
        defaultValue: "VoidVerse Cyber Universe 2026 🚀",
        required: true,
      },
      {
        id: "urlSafe",
        label: "Format URL-Safe (Ganti +/ dengan -_)",
        type: "select",
        defaultValue: "no",
        options: [
          { label: "Standar RFC 4648 (+ dan /)", value: "no" },
          { label: "URL Safe (- dan _ tanpa padding =)", value: "yes" },
        ],
      },
    ],
    examples: [
      {
        title: "Encode Emoji UTF-8",
        input: {
          action: "encode",
          content: "Portal Komik Void Verse 📖✨",
          urlSafe: "no",
        },
      },
      {
        title: "Decode Contoh Base64",
        input: {
          action: "decode",
          content: "Vm9pZFZlcnNlIEN5YmVyIFVuaXZlcnNlIDIwMjYg8J+agA==",
          urlSafe: "no",
        },
      },
    ],
    outputType: "code",
    outputLanguage: "text",
    clientExecute: async (params) => {
      return runBase64EncoderDecoder(params.content, params.action, params.urlSafe);
    },
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    description: "Dekode JSON Web Token (JWT) untuk melihat isi Header, Payload klaim, dan tanggal kedaluwarsa.",
    longDescription:
      "Urai token JWT autentikasi Supabase atau OAuth secara aman di browser tanpa mengirimkan token ke server luar manapun.",
    categoryId: "developer",
    iconName: "ShieldAlert",
    status: "popular",
    badge: "Secure",
    tags: ["JWT", "Auth", "Token", "Payload", "Security", "RFC7519"],
    inputs: [
      {
        id: "jwtString",
        label: "Token JWT (Header.Payload.Signature)",
        type: "textarea",
        placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        defaultValue:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlZvaWQgUmVhZGVyIFVzZXIiLCJyb2xlIjoidmlwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MTYyMzkwMjJ9.4zICuXj9cW4qVb6h8d0w2",
        required: true,
      },
    ],
    examples: [
      {
        title: "Contoh JWT Aktif",
        input: {
          jwtString:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlZvaWQgUmVhZGVyIFVzZXIiLCJyb2xlIjoidmlwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MTYyMzkwMjJ9.4zICuXj9cW4qVb6h8d0w2",
        },
      },
    ],
    outputType: "json",
    clientExecute: async (params) => {
      return runJwtDecoder(params.jwtString);
    },
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    description: "Uji pola Regular Expression (RegEx) secara real-time dengan tanda kecocokan (matches) dan grup.",
    longDescription:
      "Periksa ekspresi reguler untuk pemrosesan teks, scraping chapter, atau validasi input dengan flag global, multiline, dan case-insensitive.",
    categoryId: "developer",
    iconName: "Code",
    status: "ready",
    tags: ["Regex", "RegExp", "Pattern", "Tester", "Match"],
    inputs: [
      {
        id: "pattern",
        label: "Pola Regular Expression",
        type: "text",
        defaultValue: "(?:chapter|ch|ep)\\s*([\\d.]+)",
        required: true,
      },
      {
        id: "flags",
        label: "RegEx Flags",
        type: "text",
        defaultValue: "gi",
      },
      {
        id: "testString",
        label: "Teks Pengujian",
        type: "textarea",
        defaultValue: "Demonic Emperor Chapter 925\nSolo Leveling Ch 179\nOmniscient Reader Ep 297",
        required: true,
      },
    ],
    examples: [
      {
        title: "Ekstraksi Nomor Chapter",
        input: {
          pattern: "(?:chapter|ch|ep)\\s*([\\d.]+)",
          flags: "gi",
          testString: "Chapter 101\nCh 102.5\nEp 103",
        },
      },
      {
        title: "Validasi Email",
        input: {
          pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
          flags: "g",
          testString: "Kontak: admin@voidverse.net atau user.test@gmail.com",
        },
      },
    ],
    outputType: "json",
    clientExecute: async (params) => {
      return runRegexTester(params.pattern, params.flags, params.testString);
    },
  },
  {
    id: "color-converter",
    name: "Color Converter",
    description: "Konversi format warna antara HEX, RGB, HSL, HSV, CMYK, dan visualisasikan preview warna neon.",
    longDescription:
      "Alat styling warna antarmuka untuk desainer dan developer. Menyediakan kode warna siap tempel untuk CSS, Tailwind, dan cek kontras teks.",
    categoryId: "developer",
    iconName: "Palette",
    status: "popular",
    badge: "Visual",
    tags: ["Color", "HEX", "RGB", "HSL", "Tailwind", "CSS", "Contrast"],
    inputs: [
      {
        id: "colorInput",
        label: "Kode Warna (HEX, RGB, atau HSL)",
        type: "text",
        defaultValue: "#00E5FF",
        placeholder: "#00E5FF atau rgb(0, 229, 255) atau hsl(186, 100%, 50%)",
        required: true,
      },
    ],
    examples: [
      {
        title: "Cyber Cyan",
        input: { colorInput: "#00E5FF" },
      },
      {
        title: "Neon Purple",
        input: { colorInput: "#A855F7" },
      },
      {
        title: "Format RGB",
        input: { colorInput: "rgb(236, 72, 153)" },
      },
    ],
    outputType: "json",
    clientExecute: async (params) => {
      return runColorConverter(params.colorInput || params.hexCode);
    },
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Hasilkan Unique ID (UUID v4) acak secara satuan atau borongan (batch) kriptografis instan.",
    longDescription:
      "Membuat pengenal identitas unik standar RFC 4122 v4 dengan CSPRNG WebCrypto untuk ID chapter, session key, atau primary key database.",
    categoryId: "developer",
    iconName: "Hash",
    status: "ready",
    tags: ["UUID", "GUID", "Generator", "RFC4122", "UniqueId", "Crypto"],
    inputs: [
      {
        id: "count",
        label: "Jumlah UUID yang Dihasilkan",
        type: "select",
        defaultValue: "5",
        options: [
          { label: "1 UUID", value: "1" },
          { label: "5 UUID", value: "5" },
          { label: "10 UUID", value: "10" },
          { label: "25 UUID", value: "25" },
          { label: "50 UUID", value: "50" },
        ],
      },
      {
        id: "format",
        label: "Format Huruf & Bentuk",
        type: "select",
        defaultValue: "lower",
        options: [
          { label: "Huruf Kecil (lowercase)", value: "lower" },
          { label: "HURUF BESAR (UPPERCASE)", value: "upper" },
          { label: "Tanpa Tanda Hubung (no-hyphens)", value: "no-hyphens" },
          { label: "Kurung Kurawal {guid}", value: "braces" },
        ],
      },
    ],
    outputType: "code",
    outputLanguage: "text",
    clientExecute: async (params) => {
      return runUuidGenerator(params.count, params.format);
    },
  },
  {
    id: "password-generator",
    name: "Password Generator",
    description: "Buat kata sandi kuat, acak, dan aman secara kriptografis dengan kontrol karakter & skor entropi.",
    longDescription:
      "Hasilkan kata sandi dengan entropi tinggi menggunakan Crypto Web API CSPRNG untuk keamanan maksimal akun Anda.",
    categoryId: "developer",
    iconName: "Key",
    status: "popular",
    badge: "Crypto",
    tags: ["Password", "Security", "Crypto", "StrongKey", "Entropy"],
    inputs: [
      {
        id: "length",
        label: "Panjang Karakter (6 - 128)",
        type: "number",
        defaultValue: 20,
        required: true,
      },
      {
        id: "includeUppercase",
        label: "Sertakan Huruf Besar (A-Z)",
        type: "select",
        defaultValue: "yes",
        options: [
          { label: "Ya (Disarankan)", value: "yes" },
          { label: "Tidak", value: "no" },
        ],
      },
      {
        id: "includeLowercase",
        label: "Sertakan Huruf Kecil (a-z)",
        type: "select",
        defaultValue: "yes",
        options: [
          { label: "Ya (Disarankan)", value: "yes" },
          { label: "Tidak", value: "no" },
        ],
      },
      {
        id: "includeNumbers",
        label: "Sertakan Angka (0-9)",
        type: "select",
        defaultValue: "yes",
        options: [
          { label: "Ya (Disarankan)", value: "yes" },
          { label: "Tidak", value: "no" },
        ],
      },
      {
        id: "includeSymbols",
        label: "Sertakan Simbol Khusus (!@#$%^&*)",
        type: "select",
        defaultValue: "yes",
        options: [
          { label: "Ya (Sangat Kuat)", value: "yes" },
          { label: "Tidak", value: "no" },
        ],
      },
      {
        id: "excludeAmbiguous",
        label: "Hindari Karakter Ambigu (0, O, l, 1, I)",
        type: "select",
        defaultValue: "no",
        options: [
          { label: "Tidak (Gunakan Semua)", value: "no" },
          { label: "Ya (Mudah Dibaca Manusia)", value: "yes" },
        ],
      },
    ],
    examples: [
      {
        title: "Kata Sandi Standar 20 Karakter",
        input: {
          length: 20,
          includeUppercase: "yes",
          includeLowercase: "yes",
          includeNumbers: "yes",
          includeSymbols: "yes",
          excludeAmbiguous: "no",
        },
      },
      {
        title: "Master Key 32 Karakter",
        input: {
          length: 32,
          includeUppercase: "yes",
          includeLowercase: "yes",
          includeNumbers: "yes",
          includeSymbols: "yes",
          excludeAmbiguous: "yes",
        },
      },
    ],
    outputType: "code",
    outputLanguage: "text",
    clientExecute: async (params) => {
      return runPasswordGenerator(params);
    },
  },
  {
    id: "code-formatter",
    name: "Code Formatter",
    description: "Rapikan indentasi kode JavaScript, TypeScript, HTML, CSS, SQL, dan JSON secara instan.",
    longDescription:
      "Perbaiki kode yang berantakan dengan indentasi tab/spasi yang teratur, rapi, dan sesuai hierarki sintaks bahasa.",
    categoryId: "developer",
    iconName: "Code2",
    status: "ready",
    tags: ["CodeFormat", "Prettier", "TypeScript", "HTML", "CSS", "SQL", "JSON"],
    inputs: [
      {
        id: "codeSnippet",
        label: "Potongan Kode Program",
        type: "textarea",
        defaultValue: `function initVoidVerse(){const activeSource="komiku";console.log("Portal online",activeSource);return true;}`,
        required: true,
      },
      {
        id: "language",
        label: "Bahasa Kode",
        type: "select",
        defaultValue: "javascript",
        options: [
          { label: "JavaScript / TypeScript", value: "javascript" },
          { label: "JSON", value: "json" },
          { label: "HTML", value: "html" },
          { label: "CSS", value: "css" },
          { label: "SQL", value: "sql" },
        ],
      },
      {
        id: "indent",
        label: "Ukuran Indentasi",
        type: "select",
        defaultValue: "2",
        options: [
          { label: "2 Spasi", value: "2" },
          { label: "4 Spasi", value: "4" },
          { label: "Tab Indent", value: "tab" },
        ],
      },
    ],
    examples: [
      {
        title: "JavaScript Satu Baris",
        input: {
          codeSnippet: "function add(a,b){const c=a+b;return c;}",
          language: "javascript",
          indent: "2",
        },
      },
      {
        title: "HTML Bertingkat",
        input: {
          codeSnippet: "<div class=\"app\"><header><h1>Void Verse</h1></header><main><p>Selamat datang</p></main></div>",
          language: "html",
          indent: "2",
        },
      },
      {
        title: "Query SQL",
        input: {
          codeSnippet: "select id, title, rating from mangas where rating > 4.5 order by rating desc limit 10",
          language: "sql",
          indent: "2",
        },
      },
    ],
    outputType: "code",
    outputLanguage: "javascript",
    clientExecute: async (params) => {
      return runCodeFormatter(params.codeSnippet, params.language, params.indent);
    },
  },
];
