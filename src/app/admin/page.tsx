"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type OrderItem = { product_name: string; qty: number; price: number; pack_size?: string | null };
type Order = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  status: string;
  payment_method?: string;
  payment_status?: string;
  courier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  created_at: string;
  order_items: OrderItem[];
};

const STAGES = ["Placed", "Packed", "Shipped", "Delivered", "Cancelled"];

export default function AdminPage() {
  const { ready, authed, role, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (authed) loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function loadOrders() {
    setLoading(true);
    const res = await fetch("/api/admin-orders", { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
    }
    setLoading(false);
  }

  const shown = orders.filter((o) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || o.id.toLowerCase().includes(q) || o.phone.includes(q) || o.customer_name.toLowerCase().includes(q);
    return matchQ && (statusFilter === "all" || o.status === statusFilter);
  });

  function exportCsv() {
    const cell = (v: unknown) => {
      let t = String(v ?? "").replace(/"/g, '""');
      if (/^[=+\-@]/.test(t)) t = "'" + t; // never let a spreadsheet run a formula
      return `"${t}"`;
    };
    const rows = [
      ["Order", "Date", "Customer", "Phone", "Status", "Payment", "Payment status", "Total", "Items", "Address"],
      ...shown.map((o) => [
        o.id, new Date(o.created_at).toLocaleString(), o.customer_name, o.phone, o.status, o.payment_method, o.payment_status, o.total,
        o.order_items.map((i) => `${i.product_name}${i.pack_size ? ` (${i.pack_size})` : ""} x${i.qty}`).join("; "), o.address
      ])
    ];
    const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveTracking(orderId: string, form: HTMLFormElement) {
    const f = new FormData(form);
    const res = await fetch("/api/admin-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        orderId,
        courier: f.get("courier"),
        trackingNumber: f.get("trackingNumber"),
        trackingUrl: f.get("trackingUrl")
      })
    });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || "Could not save tracking.");
    else loadOrders();
  }

  async function updateStatus(orderId: string, status: string) {
    await fetch("/api/admin-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ orderId, status })
    });
    loadOrders();
  }

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
        <p className="text-[13px] text-ink-soft mb-5">
          Staff: sign in with your regular account first (top-right of the site), then
          revisit this page. Otherwise, use the admin password below.
        </p>
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

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 pb-16">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-serif text-red-dark text-2xl mb-1">Orders</h2>
          <p className="text-[13px] text-ink-soft">
            {orders.length} total orders {role && `· signed in as ${role}`}
          </p>
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

      <AdminNav active="/admin" />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order ID, name or phone" aria-label="Search orders" className="min-w-[220px] flex-1 border border-line bg-card px-3 py-2" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" className="border border-line bg-card px-3 py-2">
          <option value="all">All statuses</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={exportCsv} disabled={shown.length === 0} className="border border-ink px-4 py-2 font-semibold hover:bg-ink hover:text-cream disabled:opacity-50">Export CSV ({shown.length})</button>
      </div>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <div className="text-sm text-ink-soft">No orders yet.</div>
      ) : (
        <div className="space-y-3">
          {shown.map((o) => (
            <div key={o.id} className="border border-line rounded-xl bg-card px-5 py-4">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-sm">{o.id}</div>
                  <div className="text-[12px] text-ink-soft">
                    {o.customer_name} · {o.phone} · {new Date(o.created_at).toLocaleString()}
                    {o.payment_method && ` · ${o.payment_method}`}
                    {o.payment_status && (
                      <span className={o.payment_status === "paid" ? "text-sage font-semibold" : ""}>
                        {" "}
                        · {o.payment_status}
                      </span>
                    )}
                  </div>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  className="border border-line rounded-lg px-2.5 py-1.5 text-[12.5px] bg-cream"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-[12.5px] text-ink-soft mb-1.5">{o.address}</div>
              <div className="text-[12.5px] text-ink-soft mb-2">
                {o.order_items.map((it) => `${it.product_name}${it.pack_size ? ` (${it.pack_size})` : ""} ×${it.qty}`).join(", ")}
              </div>
              {o.status !== "Cancelled" && o.status !== "Placed" && (
                <form
                  key={`${o.id}-${o.tracking_number ?? ""}-${o.tracking_url ?? ""}`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveTracking(o.id, e.currentTarget);
                  }}
                  className="mb-3 flex flex-wrap gap-2 text-[12px]"
                >
                  <input name="courier" defaultValue={o.courier ?? ""} placeholder="Courier" aria-label="Courier" className="w-28 border border-line bg-cream px-2 py-1" />
                  <input name="trackingNumber" defaultValue={o.tracking_number ?? ""} placeholder="Tracking no." aria-label="Tracking number" className="w-36 border border-line bg-cream px-2 py-1" />
                  <input name="trackingUrl" defaultValue={o.tracking_url ?? ""} placeholder="Tracking link (https://…)" aria-label="Tracking link" className="min-w-[180px] flex-1 border border-line bg-cream px-2 py-1" />
                  <button type="submit" className="border border-ink px-3 py-1 font-semibold hover:bg-ink hover:text-cream">Save tracking</button>
                </form>
              )}
              <div className="flex items-center justify-between">
                <div className="font-mono font-semibold text-red-dark text-sm">₹{o.total}</div>
                <a
                  href={`/api/orders/invoice?orderId=${encodeURIComponent(o.id)}&phone=${encodeURIComponent(o.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11.5px] text-ink-soft underline hover:text-red-dark"
                >
                  Invoice
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
