"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type CertRow = { id: string; product_id: string; product_name: string; title: string; file_url: string; uploaded_at: string };
type ProductOption = { id: string; name: string };

export default function AdminCertificatesPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function load() {
    setLoading(true);
    const [certsRes, productsRes] = await Promise.all([
      fetch("/api/admin-certificates", { headers: authHeaders }),
      fetch("/api/admin-products", { headers: authHeaders })
    ]);
    if (certsRes.ok) setCerts((await certsRes.json()).certificates ?? []);
    if (productsRes.ok) setProducts((await productsRes.json()).products ?? []);
    setLoading(false);
  }

  async function upload() {
    setError("");
    if (!productId || !title.trim() || !file) {
      setError("Please choose a product, a title, and a file.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("title", title.trim());
    formData.append("file", file);
    const res = await fetch("/api/admin-certificates", { method: "POST", headers: authHeaders, body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error || "Upload failed.");
      return;
    }
    setTitle("");
    setFile(null);
    setProductId("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this certificate?")) return;
    setCerts((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/admin-certificates?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders });
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
    <div className="max-w-3xl mx-auto px-5 py-10 pb-16">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-red-dark text-2xl mb-1">Lab &amp; FSSAI certificates</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">
            Sign out
          </button>
          <Link href="/" className="text-sm text-ink-soft underline">
            Back to store
          </Link>
        </div>
      </div>

      <AdminNav active="/admin/certificates" />

      <div className="bg-card border border-line rounded-xl px-5 py-5 my-6 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-ink-soft mb-1">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
          >
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-ink-soft mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. FSSAI Lab Report — Batch 45, Aug 2026"
            className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-ink-soft mb-1">File (PDF, JPG, PNG or WebP)</label>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-[12.5px]"
          />
        </div>
        {error && <div className="col-span-2 text-[12.5px] text-red-dark">{error}</div>}
        <div className="col-span-2">
          <button
            onClick={upload}
            disabled={uploading}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload certificate"}
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : certs.length === 0 ? (
        <div className="text-sm text-ink-soft">No certificates uploaded yet.</div>
      ) : (
        <div className="space-y-2.5">
          {certs.map((c) => (
            <div key={c.id} className="border border-line rounded-xl bg-card px-4 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <div className="font-semibold text-[13.5px]">{c.title}</div>
                <div className="text-[11.5px] text-ink-soft">{c.product_name}</div>
              </div>
              <a href={c.file_url} target="_blank" rel="noreferrer" className="text-[11.5px] text-red-dark underline">
                View
              </a>
              <button onClick={() => remove(c.id)} className="text-[11.5px] text-ink-soft underline hover:text-red-dark">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
