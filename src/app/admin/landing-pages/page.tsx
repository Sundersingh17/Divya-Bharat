"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type Page = {
  id: string;
  type: "use-case" | "collection";
  title: string;
  subtitle: string | null;
  content: string | null;
  product_ids: string[];
  cover_image_url: string | null;
  published: boolean;
};
type ProductOption = { id: string; name: string };

const emptyForm = {
  type: "use-case" as "use-case" | "collection",
  title: "",
  subtitle: "",
  content: "",
  productIds: [] as string[],
  coverImageUrl: ""
};

export default function AdminLandingPagesPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [pages, setPages] = useState<Page[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function load() {
    setLoading(true);
    const [pagesRes, productsRes] = await Promise.all([
      fetch("/api/admin-landing-pages", { headers: authHeaders }),
      fetch("/api/admin-products", { headers: authHeaders })
    ]);
    if (pagesRes.ok) setPages((await pagesRes.json()).pages ?? []);
    if (productsRes.ok) setProducts((await productsRes.json()).products ?? []);
    setLoading(false);
  }

  function startEdit(page: Page) {
    setEditingId(page.id);
    setForm({
      type: page.type,
      title: page.title,
      subtitle: page.subtitle ?? "",
      content: page.content ?? "",
      productIds: page.product_ids ?? [],
      coverImageUrl: page.cover_image_url ?? ""
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function toggleProduct(id: string) {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id) ? f.productIds.filter((p) => p !== id) : [...f.productIds, id]
    }));
  }

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin-landing-pages/upload-image", {
        method: "POST",
        headers: authHeaders,
        body: formData
      });
      const data = await res.json();
      if (res.ok) setForm((f) => ({ ...f, coverImageUrl: data.url }));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError("");
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin-landing-pages", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form)
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save page.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    load();
  }

  async function togglePublished(page: Page) {
    setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, published: !p.published } : p)));
    await fetch("/api/admin-landing-pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ id: page.id, published: !page.published })
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this page permanently?")) return;
    setPages((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/admin-landing-pages?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders });
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
        <h2 className="font-serif text-red-dark text-2xl mb-1">Landing pages</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">
            Sign out
          </button>
          <Link href="/" className="text-sm text-ink-soft underline">
            Back to store
          </Link>
        </div>
      </div>

      <AdminNav active="/admin/landing-pages" />

      <p className="text-[12.5px] text-ink-soft my-5 max-w-2xl">
        Use-case pages (e.g. "cooking oil for diabetics") and collections (e.g. "Diwali gift hampers") are the
        same thing under the hood — pick which one this is, add a title and a curated set of products.
      </p>

      <button
        onClick={showForm && !editingId ? () => setShowForm(false) : startNew}
        className="mb-5 text-[13px] font-semibold text-red-dark border border-line rounded-full px-4 py-2 hover:border-gold transition-colors"
      >
        {showForm && !editingId ? "Cancel" : "+ New page"}
      </button>

      {showForm && (
        <div className="bg-card border border-line rounded-xl px-5 py-5 mb-6 space-y-3">
          <div className="flex gap-2">
            {(["use-case", "collection"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, type: t })}
                className={`text-[12px] font-semibold px-3.5 py-2 rounded-full border ${
                  form.type === t ? "bg-red text-[#FBF6EE] border-red" : "border-line text-ink-soft"
                }`}
              >
                {t === "use-case" ? "Use-case page" : "Collection"}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title (e.g. Best Oils for Diabetics, or Diwali Gift Hampers)"
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream"
          />
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder="Subtitle / meta description"
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream"
          />
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Cover image (optional)</label>
            <div className="flex items-center gap-3">
              {form.coverImageUrl && (
                <img src={form.coverImageUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-line" />
              )}
              <label className="text-[12px] font-semibold text-red-dark border border-dashed border-line rounded-lg px-3 py-2 cursor-pointer hover:border-gold">
                {uploading ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadCover(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Optional longer editorial content (Markdown) — the case for this use-case/collection"
            rows={6}
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream font-mono"
          />
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">
              Products in this page ({form.productIds.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border border-line rounded-lg p-2.5 bg-cream">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`text-[11.5px] rounded-full px-2.5 py-1 border ${
                    form.productIds.includes(p.id)
                      ? "bg-red text-[#FBF6EE] border-red"
                      : "border-line text-ink-soft hover:border-gold"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="text-[12.5px] text-red-dark">{error}</div>}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Publish page"}
          </button>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : pages.length === 0 ? (
        <div className="text-sm text-ink-soft">No landing pages yet.</div>
      ) : (
        <div className="space-y-2.5">
          {pages.map((p) => (
            <div key={p.id} className="border border-line rounded-xl bg-card px-4 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <div className="font-semibold text-[14px]">{p.title}</div>
                <div className="text-[11.5px] text-ink-soft">
                  /{p.type === "use-case" ? "use-case" : "collections"}/{p.id} · {p.product_ids.length} products
                </div>
              </div>
              <button
                onClick={() => togglePublished(p)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide ${
                  p.published ? "bg-[#DFEFD3] text-[#3A6620]" : "bg-[#F4DADA] text-[#8A2A2A]"
                }`}
              >
                {p.published ? "Published" : "Draft"}
              </button>
              <button onClick={() => startEdit(p)} className="text-[11.5px] text-ink-soft underline hover:text-red-dark">
                Edit
              </button>
              <button onClick={() => remove(p.id)} className="text-[11.5px] text-ink-soft underline hover:text-red-dark">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
