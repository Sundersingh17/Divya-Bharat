"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type ReturnRow = {
  id: string;
  order_id: string;
  reason: string;
  comments: string | null;
  photo_urls: string[];
  status: string;
  admin_note: string | null;
  created_at: string;
  order: { customer_name: string; email: string | null; phone: string; total: number } | null;
};

const statusClass: Record<string, string> = {
  Requested: "bg-[#FDEBC8] text-[#8A5A0B]",
  Approved: "bg-[#DDE7F5] text-[#2A5090]",
  Rejected: "bg-[#F4DADA] text-[#8A2A2A]",
  Refunded: "bg-[#DFEFD3] text-[#3A6620]"
};

export default function AdminReturnsPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin-returns", { headers: authHeaders });
    if (res.ok) setReturns((await res.json()).returns ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setReturns((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await fetch("/api/admin-returns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ id, status, adminNote: notes[id] })
    });
    load();
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
        <h2 className="font-serif text-red-dark text-2xl mb-1">Returns &amp; refunds</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">
            Sign out
          </button>
          <Link href="/" className="text-sm text-ink-soft underline">
            Back to store
          </Link>
        </div>
      </div>

      <AdminNav active="/admin/returns" />

      {loading ? (
        <Spinner />
      ) : returns.length === 0 ? (
        <div className="text-sm text-ink-soft mt-6">No return requests yet.</div>
      ) : (
        <div className="space-y-3 mt-6">
          {returns.map((r) => (
            <div key={r.id} className="border border-line rounded-xl bg-card px-5 py-4">
              <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                <div>
                  <div className="font-semibold text-sm font-mono">{r.order_id}</div>
                  <div className="text-[11.5px] text-ink-soft mt-0.5">
                    {r.order?.customer_name} · {r.order?.phone} · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide ${
                    statusClass[r.status] ?? "bg-cream-2 text-ink-soft"
                  }`}
                >
                  {r.status}
                </span>
              </div>

              <div className="text-[13px] mb-1">
                <b>Reason:</b> {r.reason}
              </div>
              {r.comments && <div className="text-[12.5px] text-ink-soft mb-2">"{r.comments}"</div>}

              {r.photo_urls?.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {r.photo_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="Return evidence" className="w-16 h-16 object-cover rounded-lg border border-line" />
                    </a>
                  ))}
                </div>
              )}

              {r.status === "Requested" || r.status === "Approved" ? (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-line mt-2">
                  <input
                    type="text"
                    placeholder="Note to yourself (optional)"
                    value={notes[r.id] ?? r.admin_note ?? ""}
                    onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                    className="flex-1 min-w-[140px] border border-line rounded-lg px-2.5 py-1.5 text-[12px] bg-cream"
                  />
                  {r.status === "Requested" && (
                    <>
                      <button
                        onClick={() => updateStatus(r.id, "Approved")}
                        className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full bg-[#DDE7F5] text-[#2A5090]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, "Rejected")}
                        className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full bg-[#F4DADA] text-[#8A2A2A]"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === "Approved" && (
                    <button
                      onClick={() => updateStatus(r.id, "Refunded")}
                      className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full bg-[#DFEFD3] text-[#3A6620]"
                    >
                      Mark refunded
                    </button>
                  )}
                </div>
              ) : (
                r.admin_note && <div className="text-[11.5px] text-ink-soft pt-2 border-t border-line mt-2">Note: {r.admin_note}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
