/**
 * Real Image Inspection & Processing Utilities for Void Forge
 * Handles binary magic bytes parsing for PNG, JPEG, WebP, GIF
 */

export interface ParsedImageMetadata {
  format: "png" | "jpeg" | "webp" | "gif" | "unknown";
  mimeType: string;
  width?: number;
  height?: number;
  bitDepth?: string;
  colorSpace?: string;
  hasAlphaChannel: boolean;
  fileSizeBytes: number;
  signature: string;
  details?: Record<string, any>;
}

export function inspectImageBuffer(buffer: Uint8Array): ParsedImageMetadata {
  const size = buffer.length;
  if (size < 8) {
    return {
      format: "unknown",
      mimeType: "application/octet-stream",
      hasAlphaChannel: false,
      fileSizeBytes: size,
      signature: "Too small (< 8 bytes)",
    };
  }

  // 1. PNG Detection: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    let width: number | undefined;
    let height: number | undefined;
    let bitDepth: string | undefined;
    let colorSpace = "sRGB";
    let hasAlpha = false;

    // Check IHDR chunk at offset 12
    if (size >= 29) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      width = view.getUint32(16, false);
      height = view.getUint32(20, false);
      const depth = buffer[24];
      const colorType = buffer[25];

      bitDepth = `${depth}-bit`;
      if (colorType === 0) {
        colorSpace = "Grayscale";
      } else if (colorType === 2) {
        colorSpace = "RGB";
      } else if (colorType === 3) {
        colorSpace = "Indexed";
      } else if (colorType === 4) {
        colorSpace = "Grayscale + Alpha";
        hasAlpha = true;
      } else if (colorType === 6) {
        colorSpace = "RGBA";
        hasAlpha = true;
      }
    }

    return {
      format: "png",
      mimeType: "image/png",
      width,
      height,
      bitDepth,
      colorSpace,
      hasAlphaChannel: hasAlpha,
      fileSizeBytes: size,
      signature: "89 50 4E 47 (PNG Standard)",
      details: { compression: "Deflate / Inflate", filter: "Adaptive Filtering" },
    };
  }

  // 2. JPEG Detection: FF D8
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let width: number | undefined;
    let height: number | undefined;
    let components = 3;
    let hasExif = false;

    let offset = 2;
    while (offset < size - 8) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];

      // APP1 (EXIF)
      if (marker === 0xe1) {
        const segLen = (buffer[offset + 2] << 8) | buffer[offset + 3];
        if (offset + 4 + 4 <= size) {
          const id = String.fromCharCode(
            buffer[offset + 4],
            buffer[offset + 5],
            buffer[offset + 6],
            buffer[offset + 7]
          );
          if (id === "Exif") hasExif = true;
        }
        offset += 2 + segLen;
        continue;
      }

      // SOF0 (Baseline) or SOF2 (Progressive)
      if (marker === 0xc0 || marker === 0xc2) {
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        height = view.getUint16(offset + 5, false);
        width = view.getUint16(offset + 7, false);
        components = buffer[offset + 9];
        break;
      }

      // Skip other variable markers
      if (marker >= 0xc0 && marker <= 0xfe && marker !== 0xd8 && marker !== 0xd9) {
        const segLen = (buffer[offset + 2] << 8) | buffer[offset + 3];
        offset += 2 + segLen;
      } else {
        offset += 2;
      }
    }

    return {
      format: "jpeg",
      mimeType: "image/jpeg",
      width,
      height,
      bitDepth: "8-bit per channel",
      colorSpace: components === 1 ? "Grayscale" : components === 4 ? "CMYK" : "sRGB / YCbCr",
      hasAlphaChannel: false,
      fileSizeBytes: size,
      signature: "FF D8 (JPEG / JFIF Standard)",
      details: { hasExifMetadata: hasExif, components },
    };
  }

  // 3. GIF Detection: GIF87a or GIF89a
  const gifSig = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3], buffer[4], buffer[5]);
  if (gifSig === "GIF87a" || gifSig === "GIF89a") {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const width = view.getUint16(6, true);
    const height = view.getUint16(8, true);
    return {
      format: "gif",
      mimeType: "image/gif",
      width,
      height,
      bitDepth: "8-bit Indexed",
      colorSpace: "Indexed Palette",
      hasAlphaChannel: gifSig === "GIF89a",
      fileSizeBytes: size,
      signature: `${gifSig} (Graphics Interchange Format)`,
    };
  }

  // 4. WebP Detection: RIFF .... WEBP
  const riffSig = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
  const webpSig = size >= 12 ? String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]) : "";
  if (riffSig === "RIFF" && webpSig === "WEBP") {
    let width: number | undefined;
    let height: number | undefined;
    let hasAlpha = false;
    let chunkType = "";

    if (size >= 16) {
      chunkType = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);
      if (chunkType === "VP8X" && size >= 30) {
        // Extended WebP
        const flags = buffer[20];
        hasAlpha = (flags & 0x10) !== 0;
        width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
        height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      } else if (chunkType === "VP8 " && size >= 30) {
        // Lossy
        const startCode = (buffer[23] << 16) | (buffer[24] << 8) | buffer[25];
        if (startCode === 0x9d012a) {
          width = (buffer[26] | (buffer[27] << 8)) & 0x3fff;
          height = (buffer[28] | (buffer[29] << 8)) & 0x3fff;
        }
      } else if (chunkType === "VP8L" && size >= 25) {
        // Lossless
        const b1 = buffer[21];
        const b2 = buffer[22];
        const b3 = buffer[23];
        const b4 = buffer[24];
        width = 1 + (((b2 & 0x3f) << 8) | b1);
        height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
        hasAlpha = (b4 & 0x10) !== 0;
      }
    }

    return {
      format: "webp",
      mimeType: "image/webp",
      width,
      height,
      bitDepth: "8-bit",
      colorSpace: "sRGB",
      hasAlphaChannel: hasAlpha,
      fileSizeBytes: size,
      signature: `RIFF/WEBP (${chunkType || "Standard"})`,
      details: { webpSubtype: chunkType },
    };
  }

  return {
    format: "unknown",
    mimeType: "application/octet-stream",
    hasAlphaChannel: false,
    fileSizeBytes: size,
    signature: `Custom/Binary (0x${buffer[0]?.toString(16).padStart(2, "0")})`,
  };
}
