import { sourceManager } from "@/lib/sources";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sources = sourceManager.getAvailableSources();
    return NextResponse.json({
      success: true,
      sources,
      default: "komiku",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error listing sources";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
