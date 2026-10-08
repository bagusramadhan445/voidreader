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

// Cookie helpers for Next.js middleware sync
export function setAuthCookie(token: string, maxAgeSeconds: number = 604800) {
  memoryCookieToken = token;
  if (typeof document !== "undefined") {
    document.cookie = `void_auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
  }
}

export function clearAuthCookie() {
  memoryCookieToken = null;
  if (typeof document !== "undefined") {
    document.cookie = "void_auth_token=; path=/; max-age=0; SameSite=Lax";
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
  password?: string;
  username: string;
  avatar_url: string;
}

function getStoredMockUsers(): MockStoredUser[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_AUTH_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
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
    // Local mock registration for preview/offline mode
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
    const newMockUser: MockStoredUser = {
      id: mockId,
      email: email.trim(),
      password,
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
    // Local mock login for offline / unconfigured demo
    const users = getStoredMockUsers();
    const userMatch = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    // If user does not exist or password does not match:
    if (!userMatch || userMatch.password !== password) {
      return {
        user: null,
        session: null,
        error: "Akun belum terdaftar atau password salah",
      };
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
    // 2. Call supabase.auth.signInWithPassword()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    // If credentials are invalid, email not confirmed, or user does not exist:
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

    // 5. Verify auth session exists using supabase.auth.getSession()
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
    // Initial callback check for local preview user
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
