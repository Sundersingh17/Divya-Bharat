"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { RUPEES_PER_POINT_REDEEMED } from "@/lib/loyalty";

type Transaction = {
  id: string;
  points: number;
  reason: string;
  order_id: string | null;
  created_at: string;
};

const reasonLabel: Record<string, string> = {
  earned: "Earned",
  redeemed: "Redeemed",
  reversed: "Reversed (order cancelled)"
};

export default function LoyaltySection() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("loyalty_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setTransactions(data ?? []));
  }, [user]);

  if (transactions === null) return <div className="text-sm text-ink-soft text-center py-8">Loading…</div>;

  const balance = transactions.reduce((sum, t) => sum + t.points, 0);

  return (
    <div>
      <div className="bg-[#FBF3E0] border border-gold-soft rounded-2xl px-6 py-6 text-center mb-6">
        <div className="font-bold text-3xl tabular-nums text-gold">{balance}</div>
        <div className="text-[12px] text-ink-soft mt-1">
          points · worth ₹{balance * RUPEES_PER_POINT_REDEEMED} off a future order
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-sm text-ink-soft text-center py-6">
          No activity yet — points are earned automatically on every order.
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between border border-line rounded-lg px-4 py-3 bg-card"
            >
              <div>
                <div className="text-[12.5px] font-medium text-ink">{reasonLabel[t.reason] ?? t.reason}</div>
                <div className="text-[11px] text-ink-soft">
                  {new Date(t.created_at).toLocaleDateString()}
                  {t.order_id && ` · ${t.order_id}`}
                </div>
              </div>
              <div
                className={`font-semibold tabular-nums text-[13.5px] ${
                  t.points > 0 ? "text-sage" : "text-red-dark"
                }`}
              >
                {t.points > 0 ? "+" : ""}
                {t.points}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
