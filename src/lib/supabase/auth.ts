import { getSupabase } from "./client";
import { User, Session } from "@supabase/supabase-js";

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: string | null;
}

// Memory fallbacks for SSR/test/Node environments
let memoryMockUsers: MockStoredUser[] = [];
let memorySessionUser: User | null = null;
let memoryCookieToken: string | null = null;

/**
 * Generates a cryptographically secure random hex salt (16 bytes = 32 hex chars).
 */
export function generateMockSalt(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return "dev_salt_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Derives a 256-bit PBKDF2 HMAC-SHA-256 key using WebCrypto.
 * Iterations default to 100,000 for standard work factor key stretching.
 */
export async function derivePbkdf2Hash(
  password: string,
  saltHex: string,
  iterations = 100000
): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: encoder.encode(saltHex),
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );
    return Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Safe fallback for environments lacking crypto.subtle
  return "hash_" + Buffer.from(password + saltHex).toString("base64");
}

/**
 * Hash password for local development/offline demo mode using PBKDF2 (100,000 rounds).
 * Formats as "pbkdf2:100000:<saltHex>:<hashHex>".
 * NEVER stores plaintext passwords in localStorage.
 */
export async function hashMockPassword(
  password: string,
  customSalt?: string
): Promise<string> {
  const salt = customSalt || generateMockSalt();
  const iterations = 100000;
  const hash = await derivePbkdf2Hash(password, salt, iterations);
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

/**
 * Legacy single-round SHA-256 computation for backward compatibility with old mock accounts.
 */
export async function hashLegacySha256(password: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "_voidverse_salt_dev");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return "hash_" + Buffer.from(password + "_voidverse_salt_dev").toString("base64");
}

/**
 * Verifies a password against a stored mock hash (PBKDF2, legacy SHA-256, or migrated base64).
 */
export async function verifyMockPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash) return false;

  // 1. Modern PBKDF2 format
  if (storedHash.startsWith("pbkdf2:")) {
    const parts = storedHash.split(":");
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10) || 100000;
      const salt = parts[2];
      const expected = parts[3];
      const actual = await derivePbkdf2Hash(password, salt, iterations);
      return actual === expected;
    }
  }

  // 2. Backward compatibility: Legacy single-round SHA-256
  const legacySha = await hashLegacySha256(password);
  if (storedHash === legacySha) {
    return true;
  }

  // 3. Backward compatibility: Legacy base64
  if (storedHash === "migrated_" + Buffer.from(password).toString("base64")) {
    return true;
  }

  return false;
}


/**
 * Cookie and Session helpers
 * Syncs with server-side HttpOnly, Secure, SameSite=Lax session via /api/auth/session
 */
export function setAuthCookie(token: string, maxAgeSeconds: number = 604800) {
  memoryCookieToken = token;
  if (typeof window !== "undefined") {
    // 1. Sync session cookie to server with HttpOnly
    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, maxAge: maxAgeSeconds }),
    }).catch(() => {});

    // 2. Client-side fallback cookie for non-sensitive UI checks (SameSite=Lax, Secure over HTTPS)
    const isSecure = window.location.protocol === "https:";
    document.cookie = `void_auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  }
}

export function clearAuthCookie() {
  memoryCookieToken = null;
  if (typeof window !== "undefined") {
    // 1. Clear server-side session cookie
    fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});

    // 2. Clear client-side cookie
    const isSecure = window.location.protocol === "https:";
    document.cookie = `void_auth_token=; path=/; max-age=0; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  }
}

export function getAuthCookieToken(): string | null {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/void_auth_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  return memoryCookieToken;
}

// Local mock storage keys for offline/preview mode
const LOCAL_AUTH_USERS_KEY = "void_reader_mock_users";
const LOCAL_AUTH_SESSION_KEY = "void_reader_local_auth_user";

interface MockStoredUser {
  id: string;
  email: string;
  passwordHash: string; // Plaintext passwords are NEVER stored
  username: string;
  avatar_url: string;
}

function getStoredMockUsers(): MockStoredUser[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_AUTH_USERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      let migrated = false;
      const cleanUsers: MockStoredUser[] = parsed.map((item: unknown) => {
        const u = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        if (typeof u.password === "string" && !u.passwordHash) {
          migrated = true;
          return {
            id: String(u.id || ""),
            email: String(u.email || ""),
            passwordHash: "migrated_" + Buffer.from(u.password).toString("base64"),
            username: typeof u.username === "string" ? u.username : "",
            avatar_url: typeof u.avatar_url === "string" ? u.avatar_url : "",
          };
        }
        return {
          id: String(u.id || ""),
          email: String(u.email || ""),
          passwordHash: typeof u.passwordHash === "string" ? u.passwordHash : "",
          username: typeof u.username === "string" ? u.username : "",
          avatar_url: typeof u.avatar_url === "string" ? u.avatar_url : "",
        };
      });

      if (migrated) {
        localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(cleanUsers));
      }
      return cleanUsers;
    } catch {
      return [];
    }
  }
  return memoryMockUsers;
}

function saveStoredMockUsers(users: MockStoredUser[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
  } else {
    memoryMockUsers = users;
  }
}

function getStoredSessionUser(): User | null {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  return memorySessionUser;
}

function saveStoredSessionUser(user: User | null) {
  if (typeof window !== "undefined") {
    if (user) {
      localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
    }
  } else {
    memorySessionUser = user;
  }
}

// Supabase Auth Redirect URLs configuration
export const SUPABASE_AUTH_REDIRECT_CONFIG = {
  siteUrl: "https://voidverse.my.id",
  allowedRedirects: [
    "https://voidverse.my.id/**",
    "https://voidreader-phi.vercel.app/**",
    "http://localhost:3000/**",
  ],
  defaultRedirectTo: "https://voidverse.my.id/login",
  fallbackRedirectTo: "https://voidreader-phi.vercel.app/login",
};

export function getAuthRedirectUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.startsWith("http")) {
    return `${envUrl}/login`;
  }
  return SUPABASE_AUTH_REDIRECT_CONFIG.defaultRedirectTo;
}

/**
 * Register a new user using Supabase auth.signUp().
 * Only called by the Register flow.
 */
export async function signUp(
  email: string,
  password: string,
  username: string
): Promise<AuthResponse> {
  const supabase = getSupabase();

  if (!supabase) {
    // In production, strictly reject mock registration
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
      return {
        user: null,
        session: null,
        error: "Layanan autentikasi Supabase wajib dikonfigurasi di lingkungan produksi.",
      };
    }

    // Local mock registration for preview/offline development
    const users = getStoredMockUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return {
        user: null,
        session: null,
        error: "Email sudah terdaftar. Silakan masuk.",
      };
    }

    const mockId = "local-user-" + Date.now();
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
    const passwordHash = await hashMockPassword(password);
    const newMockUser: MockStoredUser = {
      id: mockId,
      email: email.trim(),
      passwordHash,
      username,
      avatar_url: avatarUrl,
    };
    users.push(newMockUser);
    saveStoredMockUsers(users);

    const mockUser: User = {
      id: mockId,
      email: email.trim(),
      app_metadata: {},
      user_metadata: { username, avatar_url: avatarUrl },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as User;

    const mockSession: Session = {
      access_token: "mock-token-" + mockId,
      token_type: "bearer",
      expires_in: 604800,
      refresh_token: "mock-refresh-" + mockId,
      user: mockUser,
    } as Session;

    saveStoredSessionUser(mockUser);
    setAuthCookie(mockSession.access_token);

    return { user: mockUser, session: mockSession, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          username,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
        },
      },
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    // Auto-create profile record in profiles table
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        username,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
      });
    }

    if (data.session) {
      setAuthCookie(data.session.access_token, data.session.expires_in);
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mendaftar.";
    return { user: null, session: null, error: msg };
  }
}

/**
 * Sign in an existing user using Supabase auth.signInWithPassword().
 * Only called by the Login flow.
 * NEVER auto-creates user or profile.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  const supabase = getSupabase();

  if (!supabase) {
    // In production, strictly reject mock login
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
      return {
        user: null,
        session: null,
        error: "Layanan autentikasi Supabase wajib dikonfigurasi di lingkungan produksi.",
      };
    }

    // Local mock login for offline / unconfigured development
    const users = getStoredMockUsers();
    const userMatch = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    const isMatch =
      userMatch && (await verifyMockPassword(password, userMatch.passwordHash));

    if (!userMatch || !isMatch) {
      return {
        user: null,
        session: null,
        error: "Akun belum terdaftar atau password salah",
      };
    }

    // Transparently upgrade legacy hash to PBKDF2 with unique salt upon successful verification
    if (userMatch.passwordHash && !userMatch.passwordHash.startsWith("pbkdf2:")) {
      try {
        userMatch.passwordHash = await hashMockPassword(password);
        saveStoredMockUsers(users);
      } catch {
        // Silently continue if upgrade storage fails
      }
    }


    const mockUser: User = {
      id: userMatch.id,
      email: userMatch.email,
      app_metadata: {},
      user_metadata: {
        username: userMatch.username,
        avatar_url: userMatch.avatar_url,
      },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as User;

    const mockSession: Session = {
      access_token: "mock-token-" + userMatch.id,
      token_type: "bearer",
      expires_in: 604800,
      refresh_token: "mock-refresh-" + userMatch.id,
      user: mockUser,
    } as Session;

    saveStoredSessionUser(mockUser);
    setAuthCookie(mockSession.access_token);

    return { user: mockUser, session: mockSession, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      if (
        error?.message &&
        error.message.toLowerCase().includes("email not confirmed")
      ) {
        return {
          user: null,
          session: null,
          error:
            "Email belum dikonfirmasi. Silakan periksa inbox atau spam email Anda untuk mengaktifkan akun.",
        };
      }
      return {
        user: null,
        session: null,
        error: "Akun belum terdaftar atau password salah",
      };
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    const activeSession = sessionData?.session || data.session;

    if (sessionErr || !activeSession) {
      return {
        user: null,
        session: null,
        error: "Akun belum terdaftar atau password salah",
      };
    }

    setAuthCookie(activeSession.access_token, activeSession.expires_in);

    return { user: data.user, session: activeSession, error: null };
  } catch (err: unknown) {
    console.error("[Auth] signIn error:", err);
    return {
      user: null,
      session: null,
      error: "Akun belum terdaftar atau password salah",
    };
  }
}

/**
 * Sign out current user and clear sessions and cookies.
 */
export async function signOut(): Promise<{ error: string | null }> {
  const supabase = getSupabase();

  saveStoredSessionUser(null);
  clearAuthCookie();

  if (!supabase) {
    return { error: null };
  }

  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal keluar.";
    return { error: msg };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabase();

  if (!supabase) {
    return getStoredSessionUser();
  }

  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) {
    const user = getStoredSessionUser();
    if (user) {
      return {
        access_token: "mock-token-" + user.id,
        token_type: "bearer",
        expires_in: 604800,
        refresh_token: "mock-refresh-" + user.id,
        user,
      } as Session;
    }
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null, user: User | null) => void
) {
  const supabase = getSupabase();

  if (!supabase) {
    const user = getStoredSessionUser();
    if (user) {
      callback("SIGNED_IN", null, user);
    } else {
      callback("SIGNED_OUT", null, null);
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  }

  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.access_token) {
      setAuthCookie(session.access_token, session.expires_in);
    } else if (event === "SIGNED_OUT") {
      clearAuthCookie();
    }
    callback(event, session, session?.user ?? null);
  });
}
