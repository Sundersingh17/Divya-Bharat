"use client";

import { useState } from "react";

type Variant = {
  id: string;
  product_id: string;
  pack_size: string;
  price: number;
  mrp: number;
  stock_qty: number;
  is_default: boolean;
  hsn_code?: string | null;
  gst_rate?: number | null;
};

export default function VariantManager({
  productId,
  variants,
  authHeaders,
  onChange
}: {
  productId: string;
  variants: Variant[];
  authHeaders: Record<string, string>;
  onChange: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [packSize, setPackSize] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updateVariant(id: string, field: string, value: any) {
    if (typeof value === "number" && !isFinite(value)) return; // ignore an empty/invalid onBlur value
    await fetch("/api/admin-variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ id, [field]: value })
    });
    onChange();
  }

  async function removeVariant(id: string) {
    if (variants.length <= 1) {
      alert("A product needs at least one pack size — add another before removing this one.");
      return;
    }
    await fetch(`/api/admin-variants?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders
    });
    onChange();
  }

  async function addVariant() {
    setError("");
    if (!packSize.trim() || !price || !mrp) {
      setError("Fill in pack size, price, and MRP.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin-variants", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        productId,
        packSize: packSize.trim(),
        price: parseFloat(price),
        mrp: parseFloat(mrp)
      })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not add variant.");
      return;
    }
    setPackSize("");
    setPrice("");
    setMrp("");
    setShowAdd(false);
    onChange();
  }

  return (
    <div className="w-full mt-2.5 pl-[60px]">
      <div className="flex flex-wrap gap-2 mb-2">
        {variants.map((v) => (
          <div
            key={v.id}
            className="flex items-center flex-wrap gap-1.5 border border-line rounded-lg px-2 py-1.5 bg-cream max-w-[420px]"
          >
            <input
              defaultValue={v.pack_size}
              onBlur={(e) => updateVariant(v.id, "pack_size", e.target.value)}
              className="w-16 bg-transparent text-[11px] font-medium border-none focus:outline-none"
            />
            <span className="text-[10px] text-ink-soft">₹</span>
            <input
              type="number"
              defaultValue={v.price}
              onBlur={(e) => updateVariant(v.id, "price", parseFloat(e.target.value))}
              title="Selling price"
              className="w-14 bg-transparent text-[11px] border-none focus:outline-none"
            />
            <span className="text-[10px] text-ink-soft/70">MRP ₹</span>
            <input
              type="number"
              defaultValue={v.mrp}
              onBlur={(e) => updateVariant(v.id, "mrp", parseFloat(e.target.value))}
              title="MRP (struck-through price)"
              className="w-14 bg-transparent text-[11px] text-ink-soft border-none focus:outline-none"
            />
            <span className="text-[10px] text-ink-soft/70">Stock</span>
            <input
              type="number"
              defaultValue={v.stock_qty}
              onBlur={(e) => updateVariant(v.id, "stock_qty", parseFloat(e.target.value))}
              title="Stock quantity"
              className="w-12 bg-transparent text-[11px] border-none focus:outline-none"
            />
            <button
              onClick={() => updateVariant(v.id, "is_default", true)}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                v.is_default ? "bg-sage text-cream" : "bg-line text-ink-soft"
              }`}
              title="Set as default"
            >
              {v.is_default ? "Default" : "Set default"}
            </button>
            <span className="text-[10px] text-ink-soft/70">HSN</span>
            <input
              defaultValue={v.hsn_code ?? ""}
              onBlur={(e) => updateVariant(v.id, "hsn_code", e.target.value.trim() || null)}
              placeholder="—"
              title="HSN code (for GST invoices)"
              className="w-14 bg-transparent text-[11px] border-none focus:outline-none"
            />
            <span className="text-[10px] text-ink-soft/70">GST %</span>
            <input
              type="number"
              defaultValue={v.gst_rate ?? ""}
              onBlur={(e) => {
                const raw = e.target.value.trim();
                updateVariant(v.id, "gst_rate", raw === "" ? null : parseFloat(raw));
              }}
              placeholder="—"
              title="GST rate % (for GST invoices)"
              className="w-12 bg-transparent text-[11px] border-none focus:outline-none"
            />
            <button onClick={() => removeVariant(v.id)} className="text-ink-soft hover:text-red text-[13px] px-0.5">
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-[11px] font-semibold text-red-dark border border-dashed border-line rounded-lg px-2.5 py-1.5 hover:border-gold"
        >
          + Pack size
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-1.5 items-center flex-wrap mb-2">
          <input
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            placeholder="e.g. 750 g"
            className="w-24 border border-line rounded-lg px-2 py-1.5 text-[11px] bg-card"
          />
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            className="w-20 border border-line rounded-lg px-2 py-1.5 text-[11px] bg-card"
          />
          <input
            type="number"
            value={mrp}
            onChange={(e) => setMrp(e.target.value)}
            placeholder="MRP"
            className="w-20 border border-line rounded-lg px-2 py-1.5 text-[11px] bg-card"
          />
          <button
            onClick={addVariant}
            disabled={saving}
            className="text-[11px] font-semibold bg-red text-[#FBF6EE] rounded-lg px-3 py-1.5 hover:bg-red-dark disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
      )}
      {error && <div className="text-[11px] text-red-dark mb-1.5">{error}</div>}
    </div>
  );
}
