"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type Row = { pincode: string; min_days: number; max_days: number };

export default function AdminDeliveryPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } = useAdminAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [lines, setLines] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/admin-pincodes", { headers: authHeaders });
    if (res.ok) setRows((await res.json()).pincodes ?? []);
  }
  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function save() {
    setMessage("");
    const res = await fetch("/api/admin-pincodes", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ lines })
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || "Could not save.");
    setMessage(`Saved ${data.saved} PIN codes.`);
    setLines("");
    load();
  }

  async function remove(pin: string) {
    await fetch(`/api/admin-pincodes?pin=${pin}`, { method: "DELETE", headers: authHeaders });
    load();
  }

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

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 pb-16">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl text-red-dark">Delivery PIN codes</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">Sign out</button>
          <Link href="/" className="text-sm text-ink-soft underline">Back to store</Link>
        </div>
      </div>
      <AdminNav active="/admin/delivery" />
      <p className="mb-3 text-[13px] text-ink-soft">
        The product-page PIN checker only appears once you add real serviceable PIN codes. One per line:
        <code className="mx-1 bg-cream-2 px-1">pincode,min_days,max_days</code> e.g. <code className="bg-cream-2 px-1">751001,2,4</code>. Re-saving a PIN updates it.
      </p>
      <textarea value={lines} onChange={(e) => setLines(e.target.value)} rows={6} className="mb-3 w-full rounded-lg border border-line bg-card px-3 py-2 font-mono text-sm" aria-label="PIN code lines" />
      <button onClick={save} className="mb-2 rounded-full bg-red px-5 py-2.5 text-sm font-semibold text-[#FBF6EE]">Save PIN codes</button>
      {message && <p role="status" className="mb-4 text-[13px] text-ink-soft">{message}</p>}
      <p className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{rows.length} serviceable PIN codes</p>
      <ul className="grid gap-1 text-[13px] sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.pincode} className="flex items-center justify-between border-b border-line py-1.5">
            <span>{r.pincode} · {r.min_days}–{r.max_days} days</span>
            <button onClick={() => remove(r.pincode)} className="text-[12px] text-red-dark underline">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
