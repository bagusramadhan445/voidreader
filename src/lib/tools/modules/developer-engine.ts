import { ToolExecutionResult } from "../types";

/**
 * Universal Crypto Helper across Browser & Node.js
 */
function getCrypto(): Crypto {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  // Node.js fallback if not globally exposed (usually is in Node 18+)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("crypto").webcrypto as Crypto;
  } catch {
    throw new Error("WebCrypto API tidak tersedia di environment ini.");
  }
}

/**
 * UTF-8 Safe Base64 Encoding
 */
export function utf8ToBase64(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64");
  }
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * UTF-8 Safe Base64 Decoding
 */
export function base64ToUtf8(b64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf-8");
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Helper to extract error position from JSON parsing failure
 */
export function getJsonErrorLocation(
  text: string,
  err: Error
): { line: number; column: number; position?: number } {
  const match = err.message.match(/at position (\d+)/i);
  if (match) {
    const pos = parseInt(match[1], 10);
    const before = text.slice(0, pos);
    const lines = before.split("\n");
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return { line, column, position: pos };
  }
  const lineMatch = err.message.match(/line (\d+) column (\d+)/i);
  if (lineMatch) {
    return {
      line: parseInt(lineMatch[1], 10),
      column: parseInt(lineMatch[2], 10),
    };
  }
  return { line: 1, column: 1 };
}

/**
 * Helper to create a visual indicator snippet pointing to syntax error
 */
export function getSnippetAroundPosition(
  text: string,
  line: number,
  column: number
): string {
  const lines = text.split("\n");
  const targetIdx = line - 1;
  if (targetIdx >= 0 && targetIdx < lines.length) {
    const targetLine = lines[targetIdx];
    const pointer = " ".repeat(Math.max(0, column - 1)) + "^";
    return `${targetLine}\n${pointer}`;
  }
  return "";
}

/**
 * 1. JSON FORMATTER ENGINE
 */
export function runJsonFormatter(
  rawJsonInput: any,
  indentOption: string | number = "2"
): ToolExecutionResult {
  const text = String(rawJsonInput || "").trim();
  if (!text) {
    return {
      success: false,
      error: "Teks JSON tidak boleh kosong.",
      errorCode: "INVALID_INPUT",
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const loc = getJsonErrorLocation(text, error);
    const snippet = getSnippetAroundPosition(text, loc.line, loc.column);
    return {
      success: false,
      error: `JSON tidak valid (Baris ${loc.line}, Kolom ${loc.column}): ${error.message}${snippet ? `\n\n${snippet}` : ""}`,
      errorCode: "PARSE_ERROR",
      metadata: { line: loc.line, column: loc.column },
    };
  }

  let indentNum: number | string = 2;
  const indentStr = String(indentOption || "2").toLowerCase();
  if (indentStr === "0" || indentStr === "minify" || indentStr === "compact") {
    indentNum = 0;
  } else if (indentStr === "tab") {
    indentNum = "\t";
  } else {
    const parsedNum = parseInt(indentStr, 10);
    indentNum = isNaN(parsedNum) ? 2 : Math.max(0, Math.min(8, parsedNum));
  }

  const formatted =
    indentNum === 0
      ? JSON.stringify(parsed)
      : JSON.stringify(parsed, null, indentNum);

  const keysCount =
    typeof parsed === "object" && parsed !== null
      ? Array.isArray(parsed)
        ? parsed.length
        : Object.keys(parsed).length
      : 1;

  const linesCount = formatted.split("\n").length;

  return {
    success: true,
    output: formatted,
    outputType: "code",
    outputLanguage: "json",
    errorCode: "SUCCESS",
    metadata: {
      keysCount,
      linesCount,
      characterCount: formatted.length,
      byteSize: new TextEncoder().encode(formatted).length,
    },
  };
}

/**
 * 2. JSON VALIDATOR ENGINE
 */
export function runJsonValidator(jsonStringInput: any): ToolExecutionResult {
  const text = String(jsonStringInput || "").trim();
  if (!text) {
    return {
      success: false,
      error: "Teks JSON untuk divalidasi tidak boleh kosong.",
      errorCode: "INVALID_INPUT",
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const loc = getJsonErrorLocation(text, error);
    const snippet = getSnippetAroundPosition(text, loc.line, loc.column);
    return {
      success: false,
      error: `Kesalahan Sintaks JSON pada baris ${loc.line}, kolom ${loc.column}: ${error.message}`,
      errorCode: "PARSE_ERROR",
      output: {
        isValid: false,
        status: "Sintaks JSON Tidak Valid (RFC 8259 Error)",
        error: error.message,
        line: loc.line,
        column: loc.column,
        snippet,
      },
      outputType: "json",
    };
  }

  const getType = (val: any): string => {
    if (val === null) return "Null";
    if (Array.isArray(val)) return `Array (${val.length} item)`;
    if (typeof val === "object") return `Object (${Object.keys(val).length} properti)`;
    if (typeof val === "string") return `String (${val.length} karakter)`;
    if (typeof val === "number") return "Number";
    if (typeof val === "boolean") return "Boolean";
    return typeof val;
  };

  const calculateMaxDepth = (val: any, current = 1): number => {
    if (val === null || typeof val !== "object") return current;
    const values = Array.isArray(val) ? val : Object.values(val);
    if (values.length === 0) return current;
    let max = current;
    for (const item of values) {
      if (typeof item === "object" && item !== null) {
        max = Math.max(max, calculateMaxDepth(item, current + 1));
      }
    }
    return max;
  };

  const propCount =
    typeof parsed === "object" && parsed !== null
      ? Array.isArray(parsed)
        ? parsed.length
        : Object.keys(parsed).length
      : 1;

  const linesCount = text.split("\n").length;
  const byteSize = new TextEncoder().encode(text).length;

  return {
    success: true,
    output: {
      isValid: true,
      status: "Sintaks JSON Sempurna (100% Valid Standar RFC 8259)",
      structureType: getType(parsed),
      totalProperties: propCount,
      totalLines: linesCount,
      characterCount: text.length,
      byteSize: `${byteSize} bytes`,
      maximumNestingDepth: calculateMaxDepth(parsed),
    },
    outputType: "json",
    errorCode: "SUCCESS",
  };
}

/**
 * 3. BASE64 ENCODER DECODER ENGINE
 */
export function runBase64EncoderDecoder(
  contentInput: any,
  actionInput: string = "encode",
  urlSafeInput: string = "no"
): ToolExecutionResult {
  const content = String(contentInput || "");
  if (!content) {
    return {
      success: false,
      error: "Teks masukan tidak boleh kosong.",
      errorCode: "INVALID_INPUT",
    };
  }

  const action = String(actionInput).toLowerCase() === "decode" ? "decode" : "encode";
  const isUrlSafe = String(urlSafeInput).toLowerCase() === "yes";

  if (action === "encode") {
    try {
      let encoded = utf8ToBase64(content);
      if (isUrlSafe) {
        encoded = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      }
      return {
        success: true,
        output: encoded,
        outputType: "code",
        outputLanguage: "text",
        errorCode: "SUCCESS",
        metadata: {
          action: "encode",
          originalLength: content.length,
          encodedLength: encoded.length,
          urlSafe: isUrlSafe,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Gagal Encode Base64: ${msg}`,
        errorCode: "PROVIDER_ERROR",
      };
    }
  } else {
    try {
      let b64 = content.trim();
      // Normalize URL-safe Base64
      b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4 !== 0) {
        b64 += "=";
      }

      // Check for valid Base64 characters
      if (!/^[A-Za-z0-9+/=]+$/.test(b64)) {
        return {
          success: false,
          error: "Gagal Decode: Teks mengandung karakter yang bukan format Base64 yang valid.",
          errorCode: "PARSE_ERROR",
        };
      }

      const decoded = base64ToUtf8(b64);
      return {
        success: true,
        output: decoded,
        outputType: "code",
        outputLanguage: "text",
        errorCode: "SUCCESS",
        metadata: {
          action: "decode",
          decodedLength: decoded.length,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Gagal Decode: Format Base64 tidak valid (${msg})`,
        errorCode: "PARSE_ERROR",
      };
    }
  }
}

/**
 * 4. JWT DECODER ENGINE
 */
export function runJwtDecoder(jwtInput: any): ToolExecutionResult {
  const token = String(jwtInput || "").trim();
  if (!token) {
    return {
      success: false,
      error: "Token JWT tidak boleh kosong.",
      errorCode: "INVALID_INPUT",
    };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      success: false,
      error:
        "Format JWT tidak valid: Token harus terdiri dari 3 bagian yang dipisahkan titik (header.payload.signature).",
      errorCode: "INVALID_INPUT",
    };
  }

  const decodeBase64Url = (str: string): string => {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    return base64ToUtf8(base64);
  };

  let header: any;
  let payload: any;

  try {
    const rawHeader = decodeBase64Url(parts[0]);
    header = JSON.parse(rawHeader);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Bagian Header JWT tidak dapat diparsing sebagai JSON: ${msg}`,
      errorCode: "PARSE_ERROR",
    };
  }

  try {
    const rawPayload = decodeBase64Url(parts[1]);
    payload = JSON.parse(rawPayload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Bagian Payload JWT tidak dapat diparsing sebagai JSON: ${msg}`,
      errorCode: "PARSE_ERROR",
    };
  }

  let expiryStatus = "Tidak ada klaim exp (kadaluwarsa tidak diatur)";
  let isExpired = false;
  let timeRemaining = "";

  if (typeof payload.exp === "number") {
    const expDate = new Date(payload.exp * 1000);
    const now = Date.now();
    isExpired = now > expDate.getTime();
    const diffSec = Math.floor(Math.abs(expDate.getTime() - now) / 1000);

    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    const diffHuman =
      days > 0
        ? `${days} hari ${hours} jam`
        : hours > 0
        ? `${hours} jam ${mins} menit`
        : mins > 0
        ? `${mins} menit ${secs} detik`
        : `${secs} detik`;

    if (isExpired) {
      expiryStatus = `KEDALUWARSA pada ${expDate.toLocaleString()} (${diffHuman} yang lalu)`;
      timeRemaining = `Kadaluwarsa sejak ${diffHuman} lalu`;
    } else {
      expiryStatus = `AKTIF hingga ${expDate.toLocaleString()} (sisa waktu: ${diffHuman})`;
      timeRemaining = `Sisa aktif: ${diffHuman}`;
    }
  }

  let issuedAtFormatted: string | undefined;
  if (typeof payload.iat === "number") {
    issuedAtFormatted = new Date(payload.iat * 1000).toLocaleString();
  }

  return {
    success: true,
    output: {
      summary: {
        algorithm: header.alg || "none",
        type: header.typ || "JWT",
        tokenState: isExpired ? "EXPIRED" : payload.exp ? "ACTIVE" : "NO_EXPIRY",
        issuedAt: issuedAtFormatted || "Tidak diatur",
        expiryDate: expiryStatus,
        timeRemaining,
      },
      header,
      payload,
      signature: {
        present: parts[2].length > 0,
        length: parts[2].length,
        algorithm: header.alg || "Unknown",
        securityNotice:
          "Dekode dilakukan secara aman di memori lokal. Verifikasi tanda tangan kriptografis memerlukan secret key.",
      },
    },
    outputType: "json",
    errorCode: "SUCCESS",
  };
}

/**
 * 5. REGEX TESTER ENGINE
 */
export function runRegexTester(
  patternInput: any,
  flagsInput: any = "gi",
  testStringInput: any = ""
): ToolExecutionResult {
  const pattern = String(patternInput || "");
  if (!pattern) {
    return {
      success: false,
      error: "Pola Regular Expression tidak boleh kosong.",
      errorCode: "INVALID_INPUT",
    };
  }

  const flags = String(flagsInput ?? "gi").trim();
  const text = String(testStringInput ?? "");

  // Validate flags
  if (!/^[gimsuy]*$/.test(flags)) {
    return {
      success: false,
      error: "Flag RegEx tidak valid. Gunakan kombinasi: g, i, m, s, u, y.",
      errorCode: "INVALID_INPUT",
    };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Sintaks Regular Expression tidak valid: ${msg}`,
      errorCode: "PARSE_ERROR",
    };
  }

  const matches: Array<{
    fullMatch: string;
    index: number;
    endIndex: number;
    groups: string[];
    namedGroups: Record<string, string>;
    lineNumber: number;
  }> = [];

  const maxMatches = 1000;
  let match: RegExpExecArray | null;

  const calculateLineNumber = (charIndex: number): number => {
    return text.slice(0, charIndex).split("\n").length;
  };

  if (flags.includes("g")) {
    let lastIdx = -1;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        fullMatch: match[0],
        index: match.index,
        endIndex: match.index + match[0].length,
        groups: match.slice(1).map((g) => (g !== undefined ? g : "")),
        namedGroups: match.groups ? { ...match.groups } : {},
        lineNumber: calculateLineNumber(match.index),
      });

      // Avoid infinite loop on zero-width match
      if (regex.lastIndex === lastIdx) {
        regex.lastIndex++;
      }
      lastIdx = regex.lastIndex;

      if (matches.length >= maxMatches) {
        break;
      }
    }
  } else {
    match = regex.exec(text);
    if (match) {
      matches.push({
        fullMatch: match[0],
        index: match.index,
        endIndex: match.index + match[0].length,
        groups: match.slice(1).map((g) => (g !== undefined ? g : "")),
        namedGroups: match.groups ? { ...match.groups } : {},
        lineNumber: calculateLineNumber(match.index),
      });
    }
  }

  return {
    success: true,
    output: {
      totalMatches: matches.length,
      pattern: `/${pattern}/${flags}`,
      status:
        matches.length > 0
          ? `Ditemukan ${matches.length} kecocokan pada teks pengujian.`
          : "Tidak ditemukan kecocokan pola pada teks pengujian.",
      matches,
    },
    outputType: "json",
    errorCode: "SUCCESS",
  };
}

/**
 * 6. COLOR CONVERTER ENGINE
 */
export function runColorConverter(colorInput: any): ToolExecutionResult {
  const input = String(colorInput || "").trim();
  if (!input) {
    return {
      success: false,
      error: "Kode warna tidak boleh kosong.",
      errorCode: "INVALID_INPUT",
    };
  }

  let r = 0;
  let g = 0;
  let b = 0;
  let a = 1;

  const cleanHex = input.replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(cleanHex)) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (/^[0-9a-fA-F]{4}$/.test(cleanHex)) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
    a = Math.round((parseInt(cleanHex[3] + cleanHex[3], 16) / 255) * 100) / 100;
  } else if (/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else if (/^[0-9a-fA-F]{8}$/.test(cleanHex)) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
    a = Math.round((parseInt(cleanHex.substring(6, 8), 16) / 255) * 100) / 100;
  } else {
    // Check RGB / RGBA
    const rgbMatch = input.match(
      /^rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/i
    );
    if (rgbMatch) {
      r = Math.min(255, parseInt(rgbMatch[1], 10));
      g = Math.min(255, parseInt(rgbMatch[2], 10));
      b = Math.min(255, parseInt(rgbMatch[3], 10));
      if (rgbMatch[4] !== undefined) {
        a = Math.min(1, Math.max(0, parseFloat(rgbMatch[4])));
      }
    } else {
      // Check HSL / HSLA
      const hslMatch = input.match(
        /^hsla?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*([\d.]+)\s*)?\)$/i
      );
      if (hslMatch) {
        const hNorm = (parseInt(hslMatch[1], 10) % 360) / 360;
        const sNorm = Math.min(100, parseInt(hslMatch[2], 10)) / 100;
        const lNorm = Math.min(100, parseInt(hslMatch[3], 10)) / 100;
        if (hslMatch[4] !== undefined) {
          a = Math.min(1, Math.max(0, parseFloat(hslMatch[4])));
        }

        if (sNorm === 0) {
          r = g = b = Math.round(lNorm * 255);
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };
          const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
          const p = 2 * lNorm - q;
          r = Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255);
          g = Math.round(hue2rgb(p, q, hNorm) * 255);
          b = Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255);
        }
      } else {
        return {
          success: false,
          error:
            "Format warna tidak valid. Masukkan format HEX (#00E5FF atau #FFF), RGB (rgb(0, 229, 255)), atau HSL (hsl(186, 100%, 50%)).",
          errorCode: "INVALID_INPUT",
        };
      }
    }
  }

  // Calculate HEX strings
  const toHex2 = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  const hex6 = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  const alphaHex = toHex2(Math.round(a * 255));
  const hex8 = `${hex6}${alphaHex}`;

  // Calculate HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  // Calculate HSV
  let hsvS = max === 0 ? 0 : (max - min) / max;
  let hsvV = max;

  // Calculate CMYK
  const cmykK = 1 - max;
  const cmykC = cmykK === 1 ? 0 : Math.round(((1 - rNorm - cmykK) / (1 - cmykK)) * 100);
  const cmykM = cmykK === 1 ? 0 : Math.round(((1 - gNorm - cmykK) / (1 - cmykK)) * 100);
  const cmykY = cmykK === 1 ? 0 : Math.round(((1 - bNorm - cmykK) / (1 - cmykK)) * 100);

  // Relative Luminance per WCAG 2.1
  const sRgb = [rNorm, gNorm, bNorm].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * sRgb[0] + 0.7152 * sRgb[1] + 0.0722 * sRgb[2];
  const isLight = luminance > 0.179;

  return {
    success: true,
    output: {
      previewHex: hex6,
      hex: hex6,
      hex8: hex8,
      rgb: `rgb(${r}, ${g}, ${b})`,
      rgba: `rgba(${r}, ${g}, ${b}, ${a})`,
      hsl: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
      hsla: `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`,
      hsv: `hsv(${Math.round(h * 360)}, ${Math.round(hsvS * 100)}%, ${Math.round(hsvV * 100)}%)`,
      cmyk: `cmyk(${cmykC}%, ${cmykM}%, ${cmykY}%, ${Math.round(cmykK * 100)}%)`,
      cssVariable: `--accent-color: ${hex6}; --accent-rgb: ${r}, ${g}, ${b};`,
      tailwindClass: `bg-[${hex6}] text-[${hex6}] border-[${hex6}]`,
      contrast: {
        relativeLuminance: Math.round(luminance * 1000) / 1000,
        isLightBackground: isLight,
        recommendedTextColor: isLight ? "#000000" : "#FFFFFF",
      },
    },
    outputType: "json",
    errorCode: "SUCCESS",
  };
}

/**
 * 7. UUID GENERATOR ENGINE
 */
export function runUuidGenerator(
  countInput: any = "5",
  formatInput: any = "lower"
): ToolExecutionResult {
  const count = Math.max(1, Math.min(100, parseInt(String(countInput || "5"), 10) || 5));
  const format = String(formatInput || "lower").toLowerCase();

  const cryptoInstance = getCrypto();
  const list: string[] = [];

  for (let i = 0; i < count; i++) {
    let id: string;
    if (typeof cryptoInstance.randomUUID === "function") {
      id = cryptoInstance.randomUUID();
    } else {
      const bytes = new Uint8Array(16);
      cryptoInstance.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC 4122
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    if (format === "upper") {
      id = id.toUpperCase();
    } else if (format === "no-hyphens") {
      id = id.replace(/-/g, "");
    } else if (format === "braces") {
      id = `{${id}}`;
    }
    list.push(id);
  }

  return {
    success: true,
    output: list.join("\n"),
    outputType: "code",
    outputLanguage: "text",
    errorCode: "SUCCESS",
    metadata: {
      count: list.length,
      format,
      specification: "RFC 4122 Version 4 (CSPRNG Cryptographically Secure)",
    },
  };
}

/**
 * 8. PASSWORD GENERATOR ENGINE
 */
export function runPasswordGenerator(options: {
  length?: any;
  includeUppercase?: any;
  includeLowercase?: any;
  includeNumbers?: any;
  includeSymbols?: any;
  excludeAmbiguous?: any;
}): ToolExecutionResult {
  const len = parseInt(String(options.length || "20"), 10);
  if (isNaN(len) || len < 6 || len > 128) {
    return {
      success: false,
      error: "Panjang kata sandi harus berupa angka antara 6 hingga 128 karakter.",
      errorCode: "INVALID_INPUT",
    };
  }

  const isYes = (val: any) =>
    val === true || String(val).toLowerCase() === "yes" || String(val) === "true";

  const incUpper = options.includeUppercase === undefined || isYes(options.includeUppercase);
  const incLower = options.includeLowercase === undefined || isYes(options.includeLowercase);
  const incNumbers = options.includeNumbers === undefined || isYes(options.includeNumbers);
  const incSymbols = options.includeSymbols === undefined || isYes(options.includeSymbols);
  const excAmbiguous = isYes(options.excludeAmbiguous);

  let lowerChars = "abcdefghijklmnopqrstuvwxyz";
  let upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let numberChars = "0123456789";
  let symbolChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  if (excAmbiguous) {
    lowerChars = lowerChars.replace(/[ilo]/g, "");
    upperChars = upperChars.replace(/[IO]/g, "");
    numberChars = numberChars.replace(/[01]/g, "");
    symbolChars = symbolChars.replace(/[|]/g, "");
  }

  const pools: string[] = [];
  if (incLower) pools.push(lowerChars);
  if (incUpper) pools.push(upperChars);
  if (incNumbers) pools.push(numberChars);
  if (incSymbols) pools.push(symbolChars);

  if (pools.length === 0) {
    return {
      success: false,
      error: "Pilih setidaknya satu jenis karakter untuk membuat kata sandi.",
      errorCode: "INVALID_INPUT",
    };
  }

  const allChars = pools.join("");
  const cryptoInstance = getCrypto();
  const passwordChars: string[] = [];

  // Guarantee at least one character from each selected pool
  for (const pool of pools) {
    const rand = new Uint32Array(1);
    cryptoInstance.getRandomValues(rand);
    passwordChars.push(pool[rand[0] % pool.length]);
  }

  // Fill remaining characters
  const remaining = len - passwordChars.length;
  if (remaining > 0) {
    const randomBuffer = new Uint32Array(remaining);
    cryptoInstance.getRandomValues(randomBuffer);
    for (let i = 0; i < remaining; i++) {
      passwordChars.push(allChars[randomBuffer[i] % allChars.length]);
    }
  }

  // Fisher-Yates shuffle using CSPRNG
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const rand = new Uint32Array(1);
    cryptoInstance.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  const password = passwordChars.join("");

  // Calculate Shannon entropy: E = L * log2(poolSize)
  const poolSize = allChars.length;
  const entropyBits = Math.round(len * Math.log2(poolSize) * 10) / 10;

  let strengthRating = "Sangat Kuat (Kriptografi Tinggi)";
  if (entropyBits < 40) {
    strengthRating = "Lemah";
  } else if (entropyBits < 60) {
    strengthRating = "Cukup";
  } else if (entropyBits < 80) {
    strengthRating = "Kuat";
  }

  return {
    success: true,
    output: password,
    outputType: "code",
    outputLanguage: "text",
    errorCode: "SUCCESS",
    metadata: {
      length: len,
      entropyBits: `${entropyBits} bits`,
      poolSize,
      strength: strengthRating,
    },
  };
}

/**
 * 9. CODE FORMATTER ENGINE
 */
export function runCodeFormatter(
  codeSnippetInput: any,
  languageInput: any = "javascript",
  indentInput: any = "2"
): ToolExecutionResult {
  const code = String(codeSnippetInput || "").trim();
  if (!code) {
    return {
      success: false,
      error: "Potongan kode program tidak boleh kosong.",
      errorCode: "INVALID_INPUT",
    };
  }

  const lang = String(languageInput || "javascript").toLowerCase();
  const indentStr = String(indentInput || "2");
  const indent = indentStr === "tab" ? "\t" : " ".repeat(parseInt(indentStr, 10) || 2);

  let formatted = code;

  if (lang === "json") {
    try {
      const parsed = JSON.parse(code);
      formatted = JSON.stringify(parsed, null, indent);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Gagal memformat JSON: ${msg}`,
        errorCode: "PARSE_ERROR",
      };
    }
  } else if (lang === "html") {
    // Robust HTML tag indentation formatter
    const voidTags = new Set([
      "area", "base", "br", "col", "embed", "hr", "img", "input",
      "link", "meta", "param", "source", "track", "wbr", "!doctype"
    ]);

    const tokens = code
      .replace(/>\s*</g, ">\n<")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let depth = 0;
    const lines: string[] = [];

    for (const token of tokens) {
      const isClosing = /^<\/[^>]+>/.test(token);
      const isOpening = /^<[a-zA-Z0-9!][^>]*>/.test(token);
      const isSelfClosing = /\/>$/.test(token);

      const tagNameMatch = token.match(/^<([a-zA-Z0-9!]+)/);
      const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : "";
      const isVoid = voidTags.has(tagName) || isSelfClosing;

      if (isClosing) {
        depth = Math.max(0, depth - 1);
      }

      lines.push(indent.repeat(depth) + token);

      if (isOpening && !isClosing && !isVoid) {
        depth++;
      }
    }

    formatted = lines.join("\n");
  } else if (lang === "css") {
    // Robust CSS formatter
    const cleaned = code
      .replace(/\s+/g, " ")
      .replace(/\{\s*/g, " {\n")
      .replace(/;\s*/g, ";\n")
      .replace(/\}\s*/g, "\n}\n");

    const tokens = cleaned
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let depth = 0;
    const lines: string[] = [];

    for (const token of tokens) {
      if (token.includes("}")) {
        depth = Math.max(0, depth - 1);
      }
      lines.push(indent.repeat(depth) + token);
      if (token.includes("{")) {
        depth++;
      }
    }

    formatted = lines.join("\n");
  } else if (lang === "sql") {
    // SQL Formatter
    const keywords = [
      "SELECT", "FROM", "WHERE", "AND", "OR", "GROUP BY", "ORDER BY",
      "HAVING", "LIMIT", "OFFSET", "JOIN", "LEFT JOIN", "RIGHT JOIN",
      "INNER JOIN", "OUTER JOIN", "INSERT INTO", "VALUES", "UPDATE",
      "SET", "DELETE FROM", "CREATE TABLE", "DROP TABLE", "ALTER TABLE",
      "UNION", "UNION ALL"
    ];

    let sql = code.replace(/\s+/g, " ");
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, "gi");
      sql = sql.replace(regex, `\n${kw}`);
    }

    formatted = sql
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => {
        const isMajorClause = /^(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|INSERT|UPDATE|DELETE|SET)/i.test(l);
        return (isMajorClause ? "" : indent) + l;
      })
      .join("\n");
  } else {
    // JavaScript / TypeScript block formatter
    const tokens = code
      .replace(/;\s*/g, ";\n")
      .replace(/\{\s*/g, " {\n")
      .replace(/\}\s*/g, "\n}\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let depth = 0;
    const lines: string[] = [];

    for (const token of tokens) {
      if (token.startsWith("}") || token.startsWith("]")) {
        depth = Math.max(0, depth - 1);
      }
      lines.push(indent.repeat(depth) + token);
      if (token.endsWith("{") || token.endsWith("[")) {
        depth++;
      }
    }

    formatted = lines.join("\n");
  }

  return {
    success: true,
    output: formatted,
    outputType: "code",
    outputLanguage: lang,
    errorCode: "SUCCESS",
    metadata: {
      language: lang,
      linesCount: formatted.split("\n").length,
      characterCount: formatted.length,
    },
  };
}
