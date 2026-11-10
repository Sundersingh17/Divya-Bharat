"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type Rev = { id: string; product_id: string; product_name: string; rating: number; review_text: string | null; is_verified_purchase: boolean; created_at: string };

export default function AdminReviewsPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } = useAdminAccess();
  const [reviews, setReviews] = useState<Rev[] | null>(null);

  async function load() {
    const res = await fetch("/api/admin-reviews", { headers: authHeaders });
    if (res.ok) setReviews((await res.json()).reviews ?? []);
    else setReviews([]);
  }
  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function remove(id: string) {
    if (!confirm("Delete this review permanently? Use this for spam or abuse only.")) return;
    await fetch(`/api/admin-reviews?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders });
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
        <h2 className="font-serif text-2xl text-red-dark">Reviews</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">Sign out</button>
          <Link href="/" className="text-sm text-ink-soft underline">Back to store</Link>
        </div>
      </div>
      <AdminNav active="/admin/reviews" />
      <p className="mb-4 text-[12.5px] text-ink-soft">Only remove spam or abusive reviews — honest negative reviews should stay.</p>
      {!reviews ? <Spinner /> : reviews.length === 0 ? <p className="text-sm text-ink-soft">No reviews yet.</p> : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border border-line bg-card p-4 text-[13px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/product/${r.product_id}`} className="font-semibold text-ink hover:text-red-dark">{r.product_name}</Link>
                  <span className="ml-2 text-gold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  {r.is_verified_purchase && <span className="ml-2 text-[11px] text-leaf">Verified purchase</span>}
                  <div className="text-[11.5px] text-ink-soft">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <button onClick={() => remove(r.id)} className="text-[12px] text-red-dark underline">Delete</button>
              </div>
              {r.review_text && <p className="mt-2 text-ink-soft">{r.review_text}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
