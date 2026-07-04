"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "chef" | "assistant";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  language: string;
  approved: boolean;
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  setLanguage: (lang: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();

    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data, error } = await getSupabase()
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) console.error("loadProfile error:", error.message);
    setProfile(data || null);
    setLoading(false);
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }

  async function signUp(email: string, password: string, fullName: string): Promise<string | null> {
    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return error ? error.message : null;
  }

  async function signOut() {
    await getSupabase().auth.signOut();
  }

  async function setLanguage(lang: string) {
    if (profile) {
      await getSupabase().from("user_profiles").update({ language: lang }).eq("id", profile.id);
    }
    setProfile((prev) => prev ? { ...prev, language: lang } : prev);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, setLanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
