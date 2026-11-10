"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Membership } from "@/lib/types";

export function useActiveMembership() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMembership(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("memberships")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("end_date", today)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setMembership(data);
        setLoading(false);
      });
  }, [user]);

  return { membership, loading, isMember: !!membership };
}
