"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type AdminAccess = {
  ready: boolean;
  authed: boolean;
  role: "owner" | "staff" | null;
  authHeaders: Record<string, string>;
  password: string;
  setPassword: (p: string) => void;
  tryPassword: () => void;
  passwordError: string;
  signOutAdmin: () => void;
};

export function useAdminAccess(): AdminAccess {
  const { user, accessToken, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<"owner" | "staff" | null>(null);
  const [mode, setMode] = useState<"staff" | "password" | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Try staff-account access first (silent — no prompt needed if it works).
  useEffect(() => {
    if (authLoading) return;
    if (!user || !accessToken) {
      // No customer session — fall back to checking a remembered password.
      const saved = sessionStorage.getItem("db_admin_pw");
      if (saved) {
        setPassword(saved);
        setMode("password");
        setAuthed(true);
        setRole("owner");
      }
      setReady(true);
      return;
    }
    fetch("/api/admin-whoami", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.isAdmin) {
          setAuthed(true);
          setRole(data.role);
          setMode("staff");
        } else {
          const saved = sessionStorage.getItem("db_admin_pw");
          if (saved) {
            setPassword(saved);
            setMode("password");
            setAuthed(true);
            setRole("owner");
          }
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [user, accessToken, authLoading]);

  function tryPassword() {
    setPasswordError("");
    fetch("/api/admin-whoami", { headers: { "x-admin-password": password } })
      .then((r) => r.json())
      .then((data) => {
        if (data.isAdmin) {
          sessionStorage.setItem("db_admin_pw", password);
          setMode("password");
          setAuthed(true);
          setRole(data.role);
        } else {
          setPasswordError("Incorrect password.");
        }
      })
      .catch(() => setPasswordError("Could not verify. Please try again."));
  }

  function signOutAdmin() {
    sessionStorage.removeItem("db_admin_pw");
    setAuthed(false);
    setRole(null);
    setMode(null);
    setPassword("");
  }

  const authHeaders: Record<string, string> =
    mode === "staff" && accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : mode === "password"
      ? { "x-admin-password": password }
      : {};

  return { ready, authed, role, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin };
}
