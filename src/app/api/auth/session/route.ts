import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { rateLimiter } from "@/lib/security/rate-limiter";
import { validateCsrfOrigin } from "@/lib/security/auth-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const csrfCheck = validateCsrfOrigin(request);
    if (!csrfCheck.valid && csrfCheck.errorResponse) {
      return csrfCheck.errorResponse;
    }

    const clientIp = rateLimiter.getClientIp(request);
    const limit = rateLimiter.check(`auth_session_${clientIp}`, 30, 60000);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak permintaan sesi autentikasi." },
        { status: 429 }
      );
    }


    const body = await request.json().catch(() => ({}));
    const { token, maxAge } = body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, error: "Token autentikasi tidak disertakan." },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();
    const isProduction =
      process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

    // 1. Production or Supabase-configured environment: Cryptographically verify token
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (!supabase) {
        return NextResponse.json(
          { success: false, error: "Gagal menginisialisasi klien autentikasi server." },
          { status: 500 }
        );
      }

      const { data, error } = await supabase.auth.getUser(cleanToken);
      if (error || !data.user) {
        return NextResponse.json(
          { success: false, error: "Token sesi tidak valid atau telah kedaluwarsa." },
          { status: 401 }
        );
      }
    } else {
      // 2. Unconfigured environment:
      if (isProduction) {
        return NextResponse.json(
          {
            success: false,
            error: "Layanan autentikasi Supabase wajib dikonfigurasi di lingkungan produksi.",
          },
          { status: 500 }
        );
      }

      // Development / mock mode validation
      if (!cleanToken.startsWith("mock-token-")) {
        return NextResponse.json(
          { success: false, error: "Format token mock development tidak valid." },
          { status: 401 }
        );
      }
    }

    // 3. Set HttpOnly, Secure, SameSite=Lax session cookie
    const isSecure = isProduction || request.nextUrl.protocol === "https:";
    const maxAgeSeconds = typeof maxAge === "number" && maxAge > 0 ? maxAge : 604800; // 7 days

    const response = NextResponse.json({
      success: true,
      message: "Sesi berhasil disimpan di server.",
    });

    response.cookies.set({
      name: "void_auth_token",
      value: cleanToken,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengelola sesi autentikasi.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const csrfCheck = validateCsrfOrigin(request);
    if (!csrfCheck.valid && csrfCheck.errorResponse) {
      return csrfCheck.errorResponse;
    }

    const isProduction =
      process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    const isSecure = isProduction || request.nextUrl.protocol === "https:";


    const response = NextResponse.json({
      success: true,
      message: "Sesi berhasil dihapus.",
    });

    response.cookies.set({
      name: "void_auth_token",
      value: "",
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus sesi.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("void_auth_token")?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (!supabase) {
        return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
      }

      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        const response = NextResponse.json({ authenticated: false, user: null }, { status: 200 });
        response.cookies.delete("void_auth_token");
        return response;
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
        },
      });
    }

    const isProduction =
      process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    if (isProduction) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    if (token.startsWith("mock-token-")) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: token.replace("mock-token-", ""),
          email: "dev@voidverse.my.id",
          user_metadata: { username: "Developer" },
        },
      });
    }

    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}
