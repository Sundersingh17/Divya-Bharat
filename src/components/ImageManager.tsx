"use client";

import { useRef, useState } from "react";
import { storagePathToUrl } from "./ProductImage";

type ImageRow = {
  id: string;
  product_id: string;
  storage_path: string;
  sort_order: number;
  url: string;
  variant_id?: string | null;
  view?: string | null;
};

export default function ImageManager({
  productId,
  images,
  variants = [],
  authHeaders,
  onChange
}: {
  productId: string;
  images: ImageRow[];
  variants?: { id: string; pack_size: string }[];
  authHeaders: Record<string, string>;
  onChange: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  // Optional tagging applied to the next upload. Leave blank for a shared image.
  const [variantId, setVariantId] = useState("");
  const [view, setView] = useState("");

  async function upload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("file", file);
    if (variantId) formData.append("variantId", variantId);
    if (view) formData.append("view", view);
    const res = await fetch("/api/admin-products/upload-image", {
      method: "POST",
      headers: authHeaders,
      body: formData
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Upload failed.");
      return;
    }
    onChange();
  }

  async function remove(id: string) {
    await fetch(`/api/admin-products/upload-image?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders
    });
    onChange();
  }

  async function move(id: string, direction: -1 | 1) {
    const idx = images.findIndex((img) => img.id === id);
    const swapWith = images[idx + direction];
    if (!swapWith) return;
    await Promise.all([
      fetch("/api/admin-products/upload-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ id: images[idx].id, sortOrder: swapWith.sort_order })
      }),
      fetch("/api/admin-products/upload-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ id: swapWith.id, sortOrder: images[idx].sort_order })
      })
    ]);
    onChange();
  }

  return (
    <div className="w-full mt-2.5 pl-[60px]">
      <p className="text-[11px] text-ink-soft mb-2">
        First photo is the main one shown on the product grid. Add a back/label
        photo, angles, etc. — customers can browse all of them on the product page.
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
        <span>Next upload is for:</span>
        <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className="border border-line bg-card px-2 py-1" aria-label="Pack size for next upload">
          <option value="">All pack sizes (shared)</option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>{v.pack_size} only</option>
          ))}
        </select>
        <select value={view} onChange={(e) => setView(e.target.value)} className="border border-line bg-card px-2 py-1" aria-label="Image view for next upload">
          <option value="">Untagged</option>
          <option value="front">Front</option>
          <option value="back">Back</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2.5 mb-2">
        {images.map((img, i) => (
          <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-line group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={storagePathToUrl(img.storage_path) ?? img.url} alt="" className="w-full h-full object-cover" />
            {(img.view || img.variant_id) && (
              <span className="absolute left-0 right-0 top-0 bg-gold/90 py-0.5 text-center text-[8px] text-ink">
                {[img.view, variants.find((v) => v.id === img.variant_id)?.pack_size].filter(Boolean).join(" · ")}
              </span>
            )}
            {i === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-ink/80 text-cream text-[8px] text-center py-0.5">
                Main
              </span>
            )}
            <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {i > 0 && (
                <button onClick={() => move(img.id, -1)} className="text-cream text-xs px-1">
                  ←
                </button>
              )}
              <button onClick={() => remove(img.id)} className="text-cream text-xs px-1">
                ✕
              </button>
              {i < images.length - 1 && (
                <button onClick={() => move(img.id, 1)} className="text-cream text-xs px-1">
                  →
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="w-16 h-16 rounded-lg border border-dashed border-line flex items-center justify-center text-[10px] text-ink-soft hover:border-gold disabled:opacity-60"
        >
          {uploading ? "…" : "+ Add"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
