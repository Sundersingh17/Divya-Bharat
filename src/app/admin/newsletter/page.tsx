"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type Sub = { email: string; created_at?: string };

export default function AdminNewsletterPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } = useAdminAccess();
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin-newsletter", { headers: authHeaders });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not load subscribers.");
      setSubs([]);
      return;
    }
    setError("");
    setTableMissing(!!data.tableMissing);
    setSubs(data.subscribers ?? []);
  }
  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function download() {
    const res = await fetch("/api/admin-newsletter?format=csv", { headers: authHeaders });
    if (!res.ok) return alert("Could not download.");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remove(email: string) {
    if (!confirm(`Remove ${email}?`)) return;
    await fetch(`/api/admin-newsletter?email=${encodeURIComponent(email)}`, { method: "DELETE", headers: authHeaders });
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
        <h2 className="font-serif text-2xl text-red-dark">Newsletter</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">Sign out</button>
          <Link href="/" className="text-sm text-ink-soft underline">Back to store</Link>
        </div>
      </div>
      <AdminNav active="/admin/newsletter" />
      {tableMissing && (
        <p className="mb-4 border border-gold-soft bg-[#FBF3E0] px-4 py-3 text-[13px]">
          The newsletter table doesn't exist in your database yet. Run <code>supabase/migration_24_newsletter.sql</code> in the
          Supabase SQL editor, then refresh. (Until then, footer signups can't be saved.)
        </p>
      )}
      {error && <p role="alert" className="mb-4 text-[13px] text-red-dark">{error}</p>}
      {!subs ? <Spinner /> : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[13px] text-ink-soft">{subs.length} subscriber{subs.length === 1 ? "" : "s"}</span>
            <button onClick={download} disabled={subs.length === 0} className="border border-ink px-4 py-2 text-[12.5px] font-semibold hover:bg-ink hover:text-cream disabled:opacity-50">Download CSV</button>
          </div>
          <ul className="divide-y divide-line border-y border-line text-[13px]">
            {subs.map((s) => (
              <li key={s.email} className="flex items-center justify-between py-2">
                <span>{s.email}</span>
                <button onClick={() => remove(s.email)} className="text-[12px] text-red-dark underline">Remove</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
