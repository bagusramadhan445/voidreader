import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protected routes requiring verified authentication
const PROTECTED_ROUTES = ["/profile"];

// Auth routes (redirect if already logged in with a valid session)
const AUTH_ROUTES = ["/login", "/register"];

/**
 * Cryptographically verifies session token against Supabase Auth API
 * or validates development-only mock token in non-production environments.
 */
async function verifySessionToken(token?: string): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const clean = token.trim();
  if (!clean) return false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isSupabaseLive = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    supabaseUrl !== "https://your-project.supabase.co"
  );

  // 1. Supabase configured environment: Cryptographic token verification
  if (isSupabaseLive) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${clean}`,
          apikey: supabaseAnonKey!,
        },
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // 2. Unconfigured environment:
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (isProduction) {
    // Strictly forbid mock token bypass in production
    return false;
  }

  // Development/mock mode fallback
  return clean.startsWith("mock-token-");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get("void_auth_token")?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 1. Protected routes: Verify token validity cryptographically
  if (isProtectedRoute) {
    if (!authToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const isValid = await verifySessionToken(authToken);
    if (!isValid) {
      // Clear invalid/stale/forged cookie and redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("void_auth_token");
      return response;
    }
  }

  // 2. Auth routes (/login, /register): Only redirect if session is genuinely valid
  if (isAuthRoute && authToken) {
    const isValid = await verifySessionToken(authToken);
    if (isValid) {
      const redirectParam = request.nextUrl.searchParams.get("redirect") || "/profile";
      return NextResponse.redirect(new URL(redirectParam, request.url));
    } else {
      // Clear invalid cookie so user can cleanly access login page
      const response = NextResponse.next();
      response.cookies.delete("void_auth_token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static assets)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt, and files with extensions
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
