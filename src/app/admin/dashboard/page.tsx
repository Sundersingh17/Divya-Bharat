"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type Analytics = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  statusCounts: Record<string, number>;
  dailyRevenue: { date: string; revenue: number }[];
  topProducts: { name: string; qty: number }[];
  activeMembers: number;
  couponRedemptions: number;
};

export default function AdminDashboardPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch("/api/admin-analytics", { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  if (!ready) {
    return (
      <div className="max-w-sm mx-auto px-5 py-24">
        <Spinner />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-5 py-24">
        <h2 className="font-serif text-red-dark text-xl mb-1.5">Admin sign-in</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && tryPassword()}
          placeholder="Admin password"
          className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-card mb-3 focus:outline-none focus:border-gold"
        />
        {passwordError && <div className="text-[12.5px] text-red-dark mb-3">{passwordError}</div>}
        <button
          onClick={tryPassword}
          className="w-full py-3 rounded-full font-semibold text-sm bg-red text-[#FBF6EE] hover:bg-red-dark"
        >
          Sign in
        </button>
      </div>
    );
  }

  const maxDaily = data ? Math.max(...data.dailyRevenue.map((d) => d.revenue), 1) : 1;

  return (
    <div className="max-w-5xl mx-auto px-5 py-10 pb-16">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-serif text-red-dark text-2xl mb-1">Dashboard</h2>
          <p className="text-[13px] text-ink-soft">Last 30 days</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">
            Sign out
          </button>
          <Link href="/" className="text-sm text-ink-soft underline">
            Back to store
          </Link>
        </div>
      </div>

      <AdminNav active="/admin/dashboard" />

      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-card border border-line rounded-xl px-4 py-4 text-center">
              <div className="font-mono font-semibold text-xl text-red-dark">₹{data.totalRevenue}</div>
              <div className="text-[10.5px] text-ink-soft uppercase tracking-wide mt-1">Revenue</div>
            </div>
            <div className="bg-card border border-line rounded-xl px-4 py-4 text-center">
              <div className="font-mono font-semibold text-xl text-red-dark">{data.totalOrders}</div>
              <div className="text-[10.5px] text-ink-soft uppercase tracking-wide mt-1">Orders</div>
            </div>
            <div className="bg-card border border-line rounded-xl px-4 py-4 text-center">
              <div className="font-mono font-semibold text-xl text-red-dark">₹{data.avgOrderValue}</div>
              <div className="text-[10.5px] text-ink-soft uppercase tracking-wide mt-1">Avg order</div>
            </div>
            <div className="bg-card border border-line rounded-xl px-4 py-4 text-center">
              <div className="font-mono font-semibold text-xl text-red-dark">{data.activeMembers}</div>
              <div className="text-[10.5px] text-ink-soft uppercase tracking-wide mt-1">Club members</div>
            </div>
          </div>

          <div className="bg-card border border-line rounded-xl px-5 py-5 mb-6">
            <div className="text-[13px] font-semibold text-ink mb-4">Revenue, last 7 days</div>
            <div className="flex items-end gap-3 h-32">
              {data.dailyRevenue.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-[10px] text-ink-soft">₹{d.revenue}</div>
                  <div
                    className="w-full bg-sage rounded-t-md transition-all"
                    style={{ height: `${Math.max((d.revenue / maxDaily) * 90, 3)}px` }}
                  />
                  <div className="text-[9.5px] text-ink-soft">
                    {new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-line rounded-xl px-5 py-5">
              <div className="text-[13px] font-semibold text-ink mb-3">Orders by status</div>
              <div className="space-y-2">
                {Object.entries(data.statusCounts).map(([status, count]) => (
                  <div key={status} className="flex justify-between text-[12.5px]">
                    <span className="text-ink-soft">{status}</span>
                    <span className="font-mono font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(data.statusCounts).length === 0 && (
                  <div className="text-[12.5px] text-ink-soft">No orders yet.</div>
                )}
              </div>
            </div>
            <div className="bg-card border border-line rounded-xl px-5 py-5">
              <div className="text-[13px] font-semibold text-ink mb-3">Top products</div>
              <div className="space-y-2">
                {data.topProducts.map((p) => (
                  <div key={p.name} className="flex justify-between text-[12.5px]">
                    <span className="text-ink-soft">{p.name}</span>
                    <span className="font-mono font-semibold">{p.qty} sold</span>
                  </div>
                ))}
                {data.topProducts.length === 0 && (
                  <div className="text-[12.5px] text-ink-soft">No sales yet.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
