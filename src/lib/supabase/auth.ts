import { getSupabase } from "./client";
import { User, Session } from "@supabase/supabase-js";

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: string | null;
}

// Local mock storage key for guest/preview auth when Supabase is not configured
const LOCAL_AUTH_KEY = "void_reader_local_auth_user";

export async function signUp(
  email: string,
  password: string,
  username: string
): Promise<AuthResponse> {
  const supabase = getSupabase();

  if (!supabase) {
    // Local mock registration for preview/offline mode
    const mockUser: User = {
      id: "local-user-" + Date.now(),
      email,
      app_metadata: {},
      user_metadata: { username, avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}` },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as User;
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(mockUser));
    }
    return { user: mockUser, session: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
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
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      });
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mendaftar.";
    return { user: null, session: null, error: msg };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  const supabase = getSupabase();

  if (!supabase) {
    // Local mock login for offline / unconfigured demo
    const stored = typeof window !== "undefined" ? localStorage.getItem(LOCAL_AUTH_KEY) : null;
    let mockUser: User;
    if (stored) {
      mockUser = JSON.parse(stored);
    } else {
      const username = email.split("@")[0] || "VoidTraveler";
      mockUser = {
        id: "local-user-" + Date.now(),
        email,
        app_metadata: {},
        user_metadata: { username, avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}` },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User;
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(mockUser));
      }
    }
    return { user: mockUser, session: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal masuk.";
    return { user: null, session: null, error: msg };
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  const supabase = getSupabase();

  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_AUTH_KEY);
  }

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
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_AUTH_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
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
  if (!supabase) return null;

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
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_AUTH_KEY);
      if (stored) {
        try {
          const user = JSON.parse(stored);
          callback("SIGNED_IN", null, user);
        } catch {
          callback("SIGNED_OUT", null, null);
        }
      } else {
        callback("SIGNED_OUT", null, null);
      }
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
    callback(event, session, session?.user ?? null);
  });
}
