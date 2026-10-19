import { NextRequest, NextResponse } from "next/server";
import { extractAudioFromVideo, validateAudioSource } from "@/lib/tools/media/audio-extractor";

import { rateLimiter } from "@/lib/security/rate-limiter";
import { sanitizeTitle, toSafeErrorMessage } from "@/lib/security/input-validator";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint for downloading/streaming extracted original audio from a video stream
 * Pipeline: Video Stream URL -> Audio Source Validation -> FFmpeg Media Processing -> MP3 Stream
 */
export async function GET(request: NextRequest) {
  try {
    const clientIp = rateLimiter.getClientIp(request);
    const limitCheck = rateLimiter.check(`dl_audio_${clientIp}`, 20, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Batas permintaan ekstraksi audio tercapai. Silakan coba lagi sebentar lagi." },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sourceUrl =
      searchParams.get("sourceUrl") ||
      searchParams.get("videoUrl") ||
      searchParams.get("url");
    const title = sanitizeTitle(searchParams.get("title") || "tiktok_video");

    if (!sourceUrl) {
      return NextResponse.json(
        { success: false, error: "Parameter sourceUrl (URL video asli) wajib disertakan." },
        { status: 400 }
      );
    }

    // 1. Audio source validation
    const validation = await validateAudioSource(sourceUrl);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `Validasi sumber audio video gagal: ${validation.error}`,
        },
        { status: 400 }
      );
    }

    // 2. Extract audio directly from video stream
    const result = await extractAudioFromVideo(sourceUrl, { title });

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Gagal mengekstrak audio dari video asli.",
        },
        { status: 500 }
      );
    }

    // 3. Return MP3 stream with download attachment headers
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": result.buffer.length.toString(),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: unknown) {
    console.error("[Downloader Audio API Error (GET)]:", err);
    const message = toSafeErrorMessage(err, "Terjadi kesalahan saat memproses audio.");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = rateLimiter.getClientIp(request);
    const limitCheck = rateLimiter.check(`dl_audio_${clientIp}`, 20, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Batas permintaan ekstraksi audio tercapai. Silakan coba lagi sebentar lagi." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const sourceUrl = body.sourceUrl || body.videoUrl || body.url;
    const title = sanitizeTitle(body.title || "tiktok_video");

    if (!sourceUrl) {
      return NextResponse.json(
        { success: false, error: "Parameter sourceUrl wajib disertakan." },
        { status: 400 }
      );
    }

    const validation = await validateAudioSource(sourceUrl);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `Validasi sumber audio video gagal: ${validation.error}`,
        },
        { status: 400 }
      );
    }

    const result = await extractAudioFromVideo(sourceUrl, { title });
    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { success: false, error: result.error || "Gagal mengekstrak audio." },
        { status: 500 }
      );
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": result.buffer.length.toString(),
      },
    });
  } catch (err: unknown) {
    console.error("[Downloader Audio API Error (POST)]:", err);
    const message = toSafeErrorMessage(err, "Terjadi kesalahan saat memproses audio.");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

