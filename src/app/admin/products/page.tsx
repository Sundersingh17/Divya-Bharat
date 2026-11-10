"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductImage, { getGalleryUrls } from "@/components/ProductImage";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import VariantManager from "@/components/VariantManager";
import ImageManager from "@/components/ImageManager";
import { useAdminAccess } from "@/lib/useAdminAccess";
import { isPositiveNumber } from "@/lib/validate";
import { LOW_STOCK_LEVEL } from "@/lib/stockLevel";

type Product = {
  id: string;
  name: string;
  name_odia: string;
  category_id: string;
  description: string | null;
  price: number;
  mrp: number;
  pack_size: string;
  stock_qty: number;
  is_active: boolean;
};
type Category = { id: string; name: string };
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
type ImageRow = { id: string; product_id: string; storage_path: string; sort_order: number; url: string };

const emptyForm = {
  id: "",
  name: "",
  name_odia: "",
  category_id: "",
  description: "",
  price: "",
  mrp: "",
  pack_size: "",
  stock_qty: "100"
};

export default function AdminProductsPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<"sizes" | "photos">("sizes");

  const [health, setHealth] = useState<{
    stockTracking: boolean;
    lowStock: { id: string; name: string; pack: string; stock: number }[];
  } | null>(null);

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Keep stock figures and the low-stock banner in step with real orders:
  // quiet refresh every 20s and whenever the admin returns to this tab.
  async function refreshQuiet() {
    if (document.hidden) return;
    try {
      const [pr, vr, hr] = await Promise.all([
        fetch("/api/admin-products", { headers: authHeaders }),
        fetch("/api/admin-variants", { headers: authHeaders }),
        fetch("/api/admin-health", { headers: authHeaders })
      ]);
      if (pr.ok) setProducts((await pr.json()).products ?? []);
      if (vr.ok) setVariants((await vr.json()).variants ?? []);
      if (hr.ok) {
        const h = await hr.json();
        setHealth({ stockTracking: !!h.stockTracking, lowStock: h.lowStock ?? [] });
      }
    } catch {
      /* offline — try again on the next tick */
    }
  }

  useEffect(() => {
    if (!authed) return;
    refreshQuiet();
    const id = setInterval(refreshQuiet, 20000);
    const onVis = () => refreshQuiet();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function load() {
    setLoading(true);
    const [productsRes, variantsRes, imagesRes] = await Promise.all([
      fetch("/api/admin-products", { headers: authHeaders }),
      fetch("/api/admin-variants", { headers: authHeaders }),
      fetch("/api/admin-products/upload-image", { headers: authHeaders })
    ]);
    if (productsRes.ok) {
      const data = await productsRes.json();
      setProducts(data.products ?? []);
      setCategories(data.categories ?? []);
    }
    if (variantsRes.ok) {
      const data = await variantsRes.json();
      setVariants(data.variants ?? []);
    }
    if (imagesRes.ok) {
      const data = await imagesRes.json();
      setImages(data.images ?? []);
    }
    setLoading(false);
  }

  async function updateField(id: string, field: string, value: any) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    await fetch("/api/admin-products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ id, [field]: value })
    });
  }

  async function updateVariantField(id: string, field: string, value: any) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
    await fetch("/api/admin-variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ id, [field]: value })
    });
    if (field === "stock_qty") refreshQuiet(); // update the low-stock banner straight away
  }

  // The price shown/charged on the storefront comes from the product's
  // default pack size once one exists, and only falls back to the base
  // product.price/mrp columns for a brand-new product with no pack sizes
  // yet. This resolves which one is actually "live" right now so the
  // quick-edit fields below always change the number a customer sees,
  // instead of silently editing a base price that a variant has already
  // superseded.
  function defaultVariantFor(productId: string) {
    const productVariants = variants.filter((v) => v.product_id === productId);
    return productVariants.find((v) => v.is_default) ?? productVariants[0] ?? null;
  }

  async function quickUpdatePrice(product: Product, field: "price" | "mrp" | "stock_qty", value: number) {
    const dv = defaultVariantFor(product.id);
    if (dv) {
      await updateVariantField(dv.id, field, value);
    } else {
      await updateField(product.id, field, value);
    }
  }

  async function createProduct() {
    setFormError("");
    if (!form.id || !form.name || !form.category_id || !form.pack_size || !form.price || !form.mrp) {
      setFormError("Please fill in ID, name, category, pack size, price, and MRP.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin-products", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price),
        mrp: parseFloat(form.mrp),
        stock_qty: parseInt(form.stock_qty, 10) || 100
      })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setFormError(data.error || "Could not create product.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
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
    <div className="max-w-5xl mx-auto px-5 py-10 pb-16">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-serif text-red-dark text-2xl mb-1">Products</h2>
          <p className="text-[13px] text-ink-soft">{products.length} products</p>
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

      <AdminNav active="/admin/products" />

      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-5 text-[13px] font-semibold text-red-dark border border-line rounded-full px-4 py-2 hover:border-gold transition-colors"
      >
        {showForm ? "Cancel" : "+ Add new product"}
      </button>

      {showForm && (
        <div className="bg-card border border-line rounded-xl px-5 py-5 mb-6">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                Product ID (lowercase-hyphenated)
              </label>
              <input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase() })}
                placeholder="e.g. sesame-oil-250ml"
                className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Name (English)</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Name (Odia)</label>
              <input
                value={form.name_odia}
                onChange={(e) => setForm({ ...form, name_odia: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Price (₹)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">MRP (₹)</label>
              <input
                type="number"
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Pack size</label>
              <input
                value={form.pack_size}
                onChange={(e) => setForm({ ...form, pack_size: e.target.value })}
                placeholder="e.g. 500 g"
                className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Stock qty</label>
              <input
                type="number"
                value={form.stock_qty}
                onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
              />
            </div>
          </div>
          {formError && <div className="text-[12.5px] text-red-dark mb-3">{formError}</div>}
          <button
            onClick={createProduct}
            disabled={saving}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create product"}
          </button>
        </div>
      )}

      {health && !health.stockTracking && (
        <div role="alert" className="mb-4 rounded-xl border border-red-dark/40 bg-[#F4DADA] px-4 py-3 text-[13px] text-[#8A2A2A]">
          <b>Automatic stock deduction is OFF.</b> Orders will not reduce stock until you run{" "}
          <code>supabase/migration_27_ops.sql</code> in the Supabase SQL editor.
        </div>
      )}
      {health && health.lowStock.length > 0 && (
        <div role="status" className="mb-4 rounded-xl border border-gold/50 bg-[#FBF3DF] px-4 py-3 text-[13px] text-ink">
          <div className="mb-1.5 font-semibold">
            <i className="ti ti-alert-triangle mr-1.5" aria-hidden="true" />
            Low stock — restock soon ({health.lowStock.length})
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {health.lowStock.map((v) => (
              <li key={v.id} className={v.stock <= 0 ? "font-semibold text-[#8A2A2A]" : ""}>
                {v.name} ({v.pack}) — {v.stock <= 0 ? "sold out" : `${v.stock} left`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-2.5">
          {products.map((p) => {
            const productVariants = variants.filter((v) => v.product_id === p.id);
            const productImages = images.filter((img) => img.product_id === p.id);
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id} className="border border-line rounded-xl bg-card px-4 py-3.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-cream-2 flex-shrink-0">
                    <ProductImage
                      productId={p.id}
                      categoryId={p.category_id}
                      alt={p.name}
                      className="w-full h-full"
                      iconSize="text-lg"
                      imageUrl={getGalleryUrls({ id: p.id, images: productImages })[0] ?? null}
                    />
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <div className="font-semibold text-[13.5px]">{p.name}</div>
                    <div className="text-[11px] text-ink-soft">
                      {p.id} · {categories.find((c) => c.id === p.category_id)?.name}
                    </div>
                  </div>
                  {(() => {
                    const dv = defaultVariantFor(p.id);
                    const displayPrice = dv ? dv.price : p.price;
                    const displayMrp = dv ? dv.mrp : p.mrp;
                    const displayStock = dv ? dv.stock_qty : p.stock_qty;
                    const lowStock = displayStock <= LOW_STOCK_LEVEL;
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1 border border-line rounded-lg px-2 py-1.5 bg-cream">
                          <span className="text-[10px] text-ink-soft">₹</span>
                          <input
                            type="number"
                            key={`price-${p.id}-${displayPrice}`}
                            defaultValue={displayPrice}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isPositiveNumber(val)) quickUpdatePrice(p, "price", val);
                            }}
                            title="Selling price"
                            className="w-14 bg-transparent text-[11px] font-semibold border-none focus:outline-none"
                          />
                          <span className="text-[10px] text-ink-soft/70">/ MRP ₹</span>
                          <input
                            type="number"
                            key={`mrp-${p.id}-${displayMrp}`}
                            defaultValue={displayMrp}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isPositiveNumber(val)) quickUpdatePrice(p, "mrp", val);
                            }}
                            title="MRP (struck-through price)"
                            className="w-14 bg-transparent text-[11px] text-ink-soft border-none focus:outline-none"
                          />
                        </div>
                        <div
                          className={`flex items-center gap-1 border rounded-lg px-2 py-1.5 ${
                            lowStock ? "border-red-dark/40 bg-[#F4DADA]" : "border-line bg-cream"
                          }`}
                        >
                          <input
                            type="number"
                            key={`stock-${p.id}-${displayStock}`}
                            defaultValue={displayStock}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isPositiveNumber(val)) quickUpdatePrice(p, "stock_qty", val);
                            }}
                            title="Stock quantity"
                            className={`w-12 bg-transparent text-[11px] font-semibold border-none focus:outline-none ${
                              lowStock ? "text-[#8A2A2A]" : ""
                            }`}
                          />
                          <span className={`text-[10px] ${lowStock ? "text-[#8A2A2A] font-bold" : "text-ink-soft"}`}>
                            {lowStock ? "low stock" : "in stock"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded && expandedPanel === "photos" ? null : p.id);
                      setExpandedPanel("photos");
                    }}
                    className="text-[11px] font-semibold text-ink-soft border border-line rounded-lg px-2.5 py-1.5 hover:border-gold"
                  >
                    {productImages.length} photo{productImages.length === 1 ? "" : "s"}{" "}
                    {isExpanded && expandedPanel === "photos" ? "▲" : "▼"}
                  </button>
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded && expandedPanel === "sizes" ? null : p.id);
                      setExpandedPanel("sizes");
                    }}
                    className="text-[11px] font-semibold text-ink-soft border border-line rounded-lg px-2.5 py-1.5 hover:border-gold"
                  >
                    {productVariants.length} size{productVariants.length === 1 ? "" : "s"}{" "}
                    {isExpanded && expandedPanel === "sizes" ? "▲" : "▼"}
                  </button>
                  <button
                    onClick={() => updateField(p.id, "is_active", !p.is_active)}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide ${
                      p.is_active ? "bg-[#DFEFD3] text-[#3A6620]" : "bg-[#F4DADA] text-[#8A2A2A]"
                    }`}
                  >
                    {p.is_active ? "Active" : "Hidden"}
                  </button>
                </div>
                {isExpanded && expandedPanel === "photos" && (
                  <ImageManager productId={p.id} images={productImages} variants={variants.filter((v) => v.product_id === p.id)} authHeaders={authHeaders} onChange={load} />
                )}
                {isExpanded && expandedPanel === "sizes" && (
                  <VariantManager
                    productId={p.id}
                    variants={productVariants}
                    authHeaders={authHeaders}
                    onChange={load}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
