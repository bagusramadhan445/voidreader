import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { isSafeDestination, safeSsrfFetch } from "@/lib/security/ssrf";

export interface AudioExtractionOptions {
  bitrate?: string; // default "192k"
  title?: string;
  timeoutMs?: number; // default 45000 (45s)
}

export interface AudioValidationResult {
  valid: boolean;
  status: number;
  contentType?: string;
  contentLength?: number;
  error?: string;
}

export interface ExtractedAudioResult {
  success: boolean;
  buffer?: Buffer;
  sizeBytes?: number;
  mimeType: string;
  format: string;
  fileName: string;
  error?: string;
}

// Simple in-memory cache for recent extracted audio (5 minutes TTL, max 10 items)
interface CacheEntry {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  timestamp: number;
}
const audioCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 10;

function getCachedAudio(key: string): CacheEntry | null {
  const entry = audioCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    audioCache.delete(key);
    return null;
  }
  return entry;
}

function setCachedAudio(key: string, entry: Omit<CacheEntry, "timestamp">) {
  if (audioCache.size >= MAX_CACHE_ENTRIES) {
    // Evict oldest
    const firstKey = audioCache.keys().next().value;
    if (firstKey) audioCache.delete(firstKey);
  }
  audioCache.set(key, { ...entry, timestamp: Date.now() });
}

/**
 * Resolves the path to the FFmpeg binary.
 * Priority:
 * 1. process.env.FFMPEG_PATH
 * 2. @ffmpeg-installer/ffmpeg package
 * 3. System 'ffmpeg' binary in PATH
 */
export function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // Direct binary location in node_modules/@ffmpeg-installer/<platform>/ffmpeg(.exe)
  // This bypasses Turbopack bundling issues with dynamic require in @ffmpeg-installer/ffmpeg/index.js
  const platform = `${process.platform}-${process.arch}`;
  const binaryName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const installerBinary = path.join(
    process.cwd(),
    "node_modules",
    "@ffmpeg-installer",
    platform,
    binaryName
  );

  if (fs.existsSync(installerBinary)) {
    return installerBinary;
  }

  return binaryName;
}

/**
 * Validates audio source URL accessibility, HTTP headers, and stream viability with SSRF checks.
 */
export async function validateAudioSource(videoUrl: string): Promise<AudioValidationResult> {
  if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
    return { valid: false, status: 0, error: "URL video tidak valid atau bukan protokol http/https." };
  }

  const destCheck = await isSafeDestination(videoUrl);
  if (!destCheck.safe) {
    return { valid: false, status: 400, error: `[SSRF Blocked] ${destCheck.reason}` };
  }

  try {
    let res = await safeSsrfFetch(videoUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "VoidVerse-MediaEngine/2.0 (compatible; Windows NT 10.0; Win64; x64)",
      },
      timeoutMs: 10000,
    }).catch(() => null);

    if (!res || !res.ok) {
      // Fallback with byte range GET in case server does not support HEAD
      res = await safeSsrfFetch(videoUrl, {
        method: "GET",
        headers: {
          "User-Agent": "VoidVerse-MediaEngine/2.0 (compatible; Windows NT 10.0; Win64; x64)",
          Range: "bytes=0-1024",
        },
        timeoutMs: 10000,
      });
    }

    if (!res.ok) {
      return {
        valid: false,
        status: res.status,
        error: `Sumber video tidak dapat diakses (HTTP ${res.status}: ${res.statusText}).`,
      };
    }

    const contentType = res.headers.get("content-type") || "";
    const contentLength = res.headers.get("content-length")
      ? parseInt(res.headers.get("content-length")!, 10)
      : undefined;

    return {
      valid: true,
      status: res.status,
      contentType,
      contentLength,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal validasi sumber video";
    return { valid: false, status: 0, error: msg };
  }
}

/**
 * Core Media Processing Pipeline:
 * Video URL -> Get MP4 Stream -> Extract Audio with FFmpeg -> Generate MP3
 *
 * Guarantees original voice, dialogue, and music preservation directly from video track.
 */
export async function extractAudioFromVideo(
  videoUrl: string,
  options?: AudioExtractionOptions
): Promise<ExtractedAudioResult> {
  const safeTitle = (options?.title || "tiktok_video")
    .slice(0, 40)
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeTitle}_original_audio.mp3`;

  // 1. Check cache first
  const cached = getCachedAudio(videoUrl);
  if (cached) {
    return {
      success: true,
      buffer: cached.buffer,
      sizeBytes: cached.buffer.length,
      mimeType: cached.mimeType,
      format: "mp3",
      fileName: cached.fileName || fileName,
    };
  }

  // 2. Audio source validation
  const validation = await validateAudioSource(videoUrl);
  if (!validation.valid) {
    return {
      success: false,
      mimeType: "audio/mpeg",
      format: "mp3",
      fileName,
      error: `Validasi sumber video gagal: ${validation.error}`,
    };
  }

  const ffmpegBinary = getFfmpegPath();
  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const tempVideoPath = path.join(tmpDir, `void_vid_${timestamp}_${randomSuffix}.mp4`);
  const tempMp3Path = path.join(tmpDir, `void_aud_${timestamp}_${randomSuffix}.mp3`);

  const bitrate = options?.bitrate || "192k";
  const timeoutMs = options?.timeoutMs || 45000;

  try {
    // 3. Download MP4 stream from original video using safeSsrfFetch with 80 MB limit
    const response = await safeSsrfFetch(videoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      timeoutMs,
      maxSizeBytes: 80 * 1024 * 1024,
    });

    if (!response.ok) {
      throw new Error(`Gagal mengunduh stream video asli: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error("Stream video asli kosong (0 bytes).");
    }

    await fs.promises.writeFile(tempVideoPath, Buffer.from(arrayBuffer));

    // 4. Run media processing via FFmpeg:
    // -vn: discard video stream
    // -acodec libmp3lame: encode to MP3 using LAME encoder
    // -b:a 192k: high fidelity audio bitrate
    const args = [
      "-y",
      "-loglevel",
      "error",
      "-i",
      tempVideoPath,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-b:a",
      bitrate,
      tempMp3Path,
    ];

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(/*turbopackIgnore: true*/ ffmpegBinary, args);
      let stderr = "";

      const timer = setTimeout(() => {
        try {
          proc.kill();
        } catch {
          // ignore
        }
        reject(new Error(`Proses ekstraksi audio timeout setelah ${timeoutMs / 1000} detik.`));
      }, timeoutMs);

      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(new Error(`Gagal memanggil media processor FFmpeg: ${err.message}`));
      });

      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          // Check for silent / missing audio stream
          if (
            stderr.includes("does not contain any stream") ||
            stderr.includes("matches no streams") ||
            stderr.includes("Output file #0 does not contain any stream")
          ) {
            reject(new Error("Video ini tidak memiliki track audio (video bisu / silent)."));
          } else {
            reject(
              new Error(
                `FFmpeg error (code ${code}): ${stderr.trim() || "Format stream video tidak didukung."}`
              )
            );
          }
        }
      });
    });

    // 5. Verify MP3 output
    const mp3Stats = await fs.promises.stat(tempMp3Path);
    if (mp3Stats.size === 0) {
      throw new Error("Berkas audio MP3 yang dihasilkan kosong.");
    }

    const buffer = await fs.promises.readFile(tempMp3Path);

    // Cache successfully generated audio
    setCachedAudio(videoUrl, {
      buffer,
      mimeType: "audio/mpeg",
      fileName,
    });

    return {
      success: true,
      buffer,
      sizeBytes: mp3Stats.size,
      mimeType: "audio/mpeg",
      format: "mp3",
      fileName,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kesalahan sistem media processing";
    return {
      success: false,
      mimeType: "audio/mpeg",
      format: "mp3",
      fileName,
      error: `Gagal mengekstrak audio dari video: ${msg}`,
    };
  } finally {
    // 6. Safe cleanup of temp files
    try {
      if (fs.existsSync(tempVideoPath)) await fs.promises.unlink(tempVideoPath);
    } catch {
      // ignore
    }
    try {
      if (fs.existsSync(tempMp3Path)) await fs.promises.unlink(tempMp3Path);
    } catch {
      // ignore
    }
  }
}
