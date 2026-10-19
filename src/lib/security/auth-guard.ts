import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "../supabase/client";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  isAdmin: boolean;
}

/**
 * Extracts and verifies the authenticated user from the NextRequest.
 * Looks for cookie `void_auth_token` or `Authorization: Bearer <token>` header.
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const cookieToken = request.cookies.get("void_auth_token")?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : null;
  const token = bearerToken || cookieToken;

  if (!token) {
    return null;
  }

  // 1. Supabase configured environment: verify token cryptographically via getUser(token)
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return null;
      }

      const user = data.user;
      const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const userEmail = user.email?.trim().toLowerCase();

      const isAdmin = Boolean(
        user.app_metadata?.role === "admin" ||
        user.user_metadata?.is_admin === true ||
        (adminEmail && userEmail && userEmail === adminEmail)
      );

      return {
        id: user.id,
        email: user.email,
        role: user.app_metadata?.role || "user",
        isAdmin,
      };
    } catch {
      return null;
    }
  }

  // 2. Local development / mock mode without Supabase:
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (isProduction) {
    // Strictly forbid mock authentication bypass in production
    return null;
  }

  // Development-only fallback:
  if (token.startsWith("mock-token-")) {
    const isDevAdmin = token.includes("admin");
    return {
      id: token.replace("mock-token-", "") || "local-dev-user",
      email: isDevAdmin ? "admin@voidverse.my.id" : "user@voidverse.my.id",
      role: isDevAdmin ? "admin" : "user",
      isAdmin: isDevAdmin,
    };
  }

  return null;
}

/**
 * Validates CSRF defense-in-depth using Sec-Fetch-Site and Origin checks
 * for state-mutating HTTP methods (POST, PUT, PATCH, DELETE).
 * Allows same-origin, local development, and trusted domain requests.
 */
export function validateCsrfOrigin(
  request: NextRequest
): { valid: boolean; errorResponse?: NextResponse } {
  const method = request.method.toUpperCase();
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!mutatingMethods.includes(method)) {
    return { valid: true };
  }

  // 1. Check Sec-Fetch-Site (modern browser standard defense)
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Akses ditolak: Permintaan lintas-situs (cross-site) tidak diizinkan untuk operasi ini (CSRF Protection).",
        },
        { status: 403 }
      ),
    };
  }

  // 2. Check Origin header if present
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      const originHost = parsedOrigin.hostname.toLowerCase();
      const requestHost = (request.headers.get("host") || "").split(":")[0].toLowerCase();

      // Same-origin
      if (requestHost && originHost === requestHost) {
        return { valid: true };
      }

      // Localhost / Development
      if (originHost === "localhost" || originHost === "127.0.0.1" || originHost === "::1") {
        return { valid: true };
      }

      // Trusted production domains
      if (
        originHost === "voidverse.my.id" ||
        originHost.endsWith(".voidverse.my.id") ||
        originHost === "voidreader-phi.vercel.app"
      ) {
        return { valid: true };
      }

      return {
        valid: false,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: `Akses ditolak: Origin "${origin}" tidak diizinkan untuk operasi mutasi data.`,
          },
          { status: 403 }
        ),
      };
    } catch {
      return {
        valid: false,
        errorResponse: NextResponse.json(
          { success: false, error: "Header Origin tidak valid." },
          { status: 400 }
        ),
      };
    }
  }

  return { valid: true };
}

/**
 * Requires the request to have a valid authenticated session.
 * Returns HTTP 401 response if unauthenticated, or HTTP 403 if CSRF check fails.
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | { errorResponse: NextResponse }> {
  // CSRF validation for mutating methods
  const csrfCheck = validateCsrfOrigin(request);
  if (!csrfCheck.valid && csrfCheck.errorResponse) {
    return { errorResponse: csrfCheck.errorResponse };
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Autentikasi diperlukan. Silakan masuk (login) ke akun Anda untuk melanjutkan.",
        },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Requires the request to be an authorized Administrator.
 * Returns HTTP 401 if unauthenticated, or HTTP 403 if unauthorized or CSRF check fails.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | { errorResponse: NextResponse }> {
  // CSRF validation for mutating methods
  const csrfCheck = validateCsrfOrigin(request);
  if (!csrfCheck.valid && csrfCheck.errorResponse) {
    return { errorResponse: csrfCheck.errorResponse };
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Autentikasi diperlukan. Silakan masuk sebagai Administrator.",
        },
        { status: 401 }
      ),
    };
  }

  if (!user.isAdmin) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Tindakan ini memerlukan hak akses Administrator.",
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}

