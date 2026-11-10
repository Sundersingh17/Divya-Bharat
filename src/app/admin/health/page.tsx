"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type Health = {
  threshold: number;
  lowStock: { id: string; name: string; pack: string; stock: number }[];
  eventCounts: Record<string, number>;
  recentEvents: { type: string; detail: any; created_at: string }[];
  eventsTableMissing: boolean;
  orders30d: { total: number; cod: number; online: number; cancelled: number };
  abandoned30d: { snapshots: number; reminded: number; recovered: number };
};

const LABELS: Record<string, string> = {
  payment_mismatch: "Payment amount mismatches",
  order_failed: "Order creation failures",
  email_failed: "Failed emails",
  stock_race: "Sold-out races",
  low_stock: "Low-stock alerts"
};

export default function AdminHealthPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } = useAdminAccess();
  const [data, setData] = useState<Health | null>(null);

  useEffect(() => {
    if (!authed) return;
    fetch("/api/admin-health", { headers: authHeaders }).then(async (r) => r.ok && setData(await r.json()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  if (!ready) return <div className="mx-auto max-w-sm px-5 py-24"><Spinner /></div>;
  if (!authed) {
    return (
      <div className="mx-auto max-w-sm px-5 py-24">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryPassword()} placeholder="Admin password" className="mb-3 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm" />
        {passwordError && <div className="mb-3 text-[12.5px] text-red-dark">{passwordError}</div>}
        <button onClick={tryPassword} className="w-full rounded-full bg-red py-3 text-sm font-semibold text-[#FBF6EE]">Sign in</button>
      </div>
    );
  }

  const card = "border border-line bg-card p-4";
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 pb-16">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl text-red-dark">Store health</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">Sign out</button>
          <Link href="/" className="text-sm text-ink-soft underline">Back to store</Link>
        </div>
      </div>
      <AdminNav active="/admin/health" />
      {!data ? <Spinner /> : (
        <div className="space-y-8">
          {data.eventsTableMissing && (
            <p className="border border-gold-soft bg-[#FBF3E0] px-4 py-3 text-[13px]">
              Event logging isn't set up yet — run <code>supabase/migration_27_ops.sql</code>.
            </p>
          )}

          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">Last 30 days</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className={card}><div className="text-[22px] font-semibold">{data.orders30d.total}</div><div className="text-[12px] text-ink-soft">Orders</div></div>
              <div className={card}><div className="text-[22px] font-semibold">{data.orders30d.online}</div><div className="text-[12px] text-ink-soft">Paid online</div></div>
              <div className={card}><div className="text-[22px] font-semibold">{data.orders30d.cod}</div><div className="text-[12px] text-ink-soft">Cash on delivery</div></div>
              <div className={card}><div className="text-[22px] font-semibold">{data.orders30d.cancelled}</div><div className="text-[12px] text-ink-soft">Cancelled</div></div>
            </div>
            <p className="mt-3 text-[13px] text-ink-soft">
              Abandoned checkouts: {data.abandoned30d.snapshots} saved, {data.abandoned30d.reminded} reminded, {data.abandoned30d.recovered} recovered into orders.
            </p>
          </section>

          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">Low stock (≤ {data.threshold})</h3>
            {data.lowStock.length === 0 ? <p className="text-[13px] text-ink-soft">Nothing is running low.</p> : (
              <ul className="divide-y divide-line border-y border-line text-[13px]">
                {data.lowStock.map((v) => (
                  <li key={v.id} className="flex justify-between py-2"><span>{v.name} · {v.pack}</span><b className={v.stock <= 0 ? "text-red-dark" : ""}>{v.stock <= 0 ? "Out of stock" : `${v.stock} left`}</b></li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">Problems in the last 7 days</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.keys(LABELS).map((k) => (
                <div key={k} className={card}>
                  <div className={`text-[22px] font-semibold ${k !== "low_stock" && (data.eventCounts[k] ?? 0) > 0 ? "text-red-dark" : ""}`}>{data.eventCounts[k] ?? 0}</div>
                  <div className="text-[12px] text-ink-soft">{LABELS[k]}</div>
                </div>
              ))}
            </div>
            {data.recentEvents.length > 0 && (
              <ul className="mt-4 space-y-1 text-[12px] text-ink-soft">
                {data.recentEvents.map((e, i) => (
                  <li key={i}>{new Date(e.created_at).toLocaleString()} — <b>{LABELS[e.type] ?? e.type}</b> {e.detail ? JSON.stringify(e.detail).slice(0, 140) : ""}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
