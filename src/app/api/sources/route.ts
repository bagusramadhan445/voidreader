import { sourceManager } from "@/lib/sources";
import { NextResponse } from "next/server";
import { toSafeErrorMessage } from "@/lib/security/input-validator";

export async function GET() {
  try {
    const sources = sourceManager.getAvailableSources();
    return NextResponse.json({
      success: true,
      sources,
      default: "komiku",
    });
  } catch (error: unknown) {
    console.error("[API /api/sources] Error:", error);
    const message = toSafeErrorMessage(error, "Gagal memuat daftar sumber komik.");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

