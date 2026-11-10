"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type OtpChannel = "phone" | "email";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  sendOtp: (identifier: string, channel: OtpChannel) => Promise<{ error: string | null }>;
  verifyOtp: (identifier: string, code: string, channel: OtpChannel) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Converts a plain 10-digit Indian mobile number into the E.164 format
// Supabase Auth's phone provider requires (e.g. 9876543210 -> +919876543210).
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAccessToken(data.session?.access_token ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAccessToken(session?.access_token ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function sendOtp(identifier: string, channel: OtpChannel) {
    const { error } =
      channel === "phone"
        ? await supabase.auth.signInWithOtp({ phone: toE164(identifier) })
        : await supabase.auth.signInWithOtp({
            email: identifier.trim().toLowerCase(),
            options: { shouldCreateUser: true }
          });
    return { error: error?.message ?? null };
  }

  async function verifyOtp(identifier: string, code: string, channel: OtpChannel) {
    const { error } =
      channel === "phone"
        ? await supabase.auth.verifyOtp({ phone: toE164(identifier), token: code, type: "sms" })
        : await supabase.auth.verifyOtp({
            email: identifier.trim().toLowerCase(),
            token: code,
            type: "email"
          });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, sendOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
