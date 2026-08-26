"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";
import { API_URL } from "./api";

export interface Profile {
  id: string;
  email: string;
  role: "veteran" | "student" | "admin";
  verified: boolean;
  display_name: string;
  zip: string;
  school: string | null;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  loading: true,
  session: null,
  profile: null,
  configured: false,
  signIn: async () => "Auth is not configured.",
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = supabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    try {
      const resp = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      setProfile(resp.ok ? await resp.json() : null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session).finally(() => setLoading(false));
    });
    const { data: sub } = sb.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      loadProfile(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [configured, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!configured) return "Auth is not configured.";
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      return error ? "That email and password don't match an account." : null;
    },
    [configured],
  );

  const signOut = useCallback(async () => {
    if (configured) await supabase().auth.signOut();
  }, [configured]);

  const refreshProfile = useCallback(async () => loadProfile(session), [loadProfile, session]);

  return (
    <AuthContext.Provider
      value={{ loading, session, profile, configured, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
