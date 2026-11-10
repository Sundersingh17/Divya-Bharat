"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type Post = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string | null;
  published: boolean;
  published_at: string;
};

const emptyForm = { title: "", excerpt: "", content: "", coverImageUrl: "", category: "" };

export default function AdminBlogPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [posts, setPosts] = useState<Post[]>([]);
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
    const res = await fetch("/api/admin-blog", { headers: authHeaders });
    if (res.ok) setPosts((await res.json()).posts ?? []);
    setLoading(false);
  }

  function startEdit(post: Post) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? "",
      content: post.content,
      coverImageUrl: post.cover_image_url ?? "",
      category: post.category ?? ""
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin-blog/upload-image", {
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
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin-blog", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form)
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save post.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    load();
  }

  async function togglePublished(post: Post) {
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, published: !p.published } : p)));
    await fetch("/api/admin-blog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ id: post.id, published: !post.published })
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this post permanently?")) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/admin-blog?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders });
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
        <h2 className="font-serif text-red-dark text-2xl mb-1">Blog</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">
            Sign out
          </button>
          <Link href="/" className="text-sm text-ink-soft underline">
            Back to store
          </Link>
        </div>
      </div>

      <AdminNav active="/admin/blog" />

      <button
        onClick={showForm && !editingId ? () => setShowForm(false) : startNew}
        className="my-5 text-[13px] font-semibold text-red-dark border border-line rounded-full px-4 py-2 hover:border-gold transition-colors"
      >
        {showForm && !editingId ? "Cancel" : "+ New post"}
      </button>

      {showForm && (
        <div className="bg-card border border-line rounded-xl px-5 py-5 mb-6 space-y-3">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream"
          />
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Category (e.g. Recipes, Nutrition, Our Process)"
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream"
          />
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            placeholder="Short excerpt (shown on the blog listing and in search results)"
            rows={2}
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream"
          />
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Cover image</label>
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
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Content (Markdown)</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={"## A heading\n\nA paragraph. **Bold** and _italic_ work. \n\n- bullet one\n- bullet two"}
              rows={14}
              className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream font-mono"
            />
          </div>
          {error && <div className="text-[12.5px] text-red-dark">{error}</div>}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Publish post"}
          </button>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <div className="text-sm text-ink-soft">No posts yet.</div>
      ) : (
        <div className="space-y-2.5">
          {posts.map((p) => (
            <div key={p.id} className="border border-line rounded-xl bg-card px-4 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <div className="font-semibold text-[14px]">{p.title}</div>
                <div className="text-[11.5px] text-ink-soft">/blog/{p.id}</div>
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
