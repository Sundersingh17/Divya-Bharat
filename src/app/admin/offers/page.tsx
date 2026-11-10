"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type OfferRow = {
  id: string;
  product_id: string;
  variant_id: string;
  offer_price: number;
  is_deal_of_the_day: boolean;
  active: boolean;
  product_name: string;
  pack_size: string;
  variant_price: number | null;
  variant_mrp: number | null;
};

type ProductOption = { id: string; name: string };
type VariantOption = { id: string; product_id: string; pack_size: string; price: number };

const emptyForm = { productId: "", variantId: "", offerPrice: "", isDealOfTheDay: false };

export default function AdminOffersPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function load() {
    setLoading(true);
    const [offersRes, productsRes, variantsRes] = await Promise.all([
      fetch("/api/admin-offers", { headers: authHeaders }),
      fetch("/api/admin-products", { headers: authHeaders }),
      fetch("/api/admin-variants", { headers: authHeaders })
    ]);
    if (offersRes.ok) setOffers((await offersRes.json()).offers ?? []);
    if (productsRes.ok) setProducts((await productsRes.json()).products ?? []);
    if (variantsRes.ok) setVariants((await variantsRes.json()).variants ?? []);
    setLoading(false);
  }

  const variantsForSelectedProduct = useMemo(
    () => variants.filter((v) => v.product_id === form.productId),
    [variants, form.productId]
  );

  const hasActiveDeal = offers.some((o) => o.active && o.is_deal_of_the_day);

  async function toggleActive(id: string, active: boolean) {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, active } : o)));
    await fetch("/api/admin-offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ id, active })
    });
    load();
  }

  async function removeOffer(id: string) {
    if (!confirm("Remove this offer?")) return;
    setOffers((prev) => prev.filter((o) => o.id !== id));
    await fetch(`/api/admin-offers?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders });
  }

  async function createOffer() {
    setFormError("");
    if (!form.productId || !form.variantId || !form.offerPrice) {
      setFormError("Please choose a product, pack size, and offer price.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin-offers", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        productId: form.productId,
        variantId: form.variantId,
        offerPrice: parseFloat(form.offerPrice) || 0,
        isDealOfTheDay: form.isDealOfTheDay
      })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setFormError(data.error || "Could not create offer.");
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
    <div className="max-w-4xl mx-auto px-5 py-10 pb-16">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-red-dark text-2xl mb-1">Daily Offers</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">
            Sign out
          </button>
          <Link href="/" className="text-sm text-ink-soft underline">
            Back to store
          </Link>
        </div>
      </div>

      <AdminNav active="/admin/offers" />

      <p className="text-[12.5px] text-ink-soft mb-5 max-w-2xl">
        These show up on the homepage as a "Deal of the Day" and a "Today's Offers" strip. There's no
        automatic expiry — turn an offer off (or delete it) whenever you want to stop running it, the same
        way you'd swap out a discount sticker in-store.
      </p>

      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-5 text-[13px] font-semibold text-red-dark border border-line rounded-full px-4 py-2 hover:border-gold transition-colors"
      >
        {showForm ? "Cancel" : "+ New offer"}
      </button>

      {showForm && (
        <div className="bg-card border border-line rounded-xl px-5 py-5 mb-6 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Product</label>
            <select
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value, variantId: "" })}
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
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Pack size</label>
            <select
              value={form.variantId}
              onChange={(e) => setForm({ ...form, variantId: e.target.value })}
              disabled={!form.productId}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream disabled:opacity-50"
            >
              <option value="">Select a pack size…</option>
              {variantsForSelectedProduct.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.pack_size} (currently ₹{v.price})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Offer price (₹)</label>
            <input
              type="number"
              value={form.offerPrice}
              onChange={(e) => setForm({ ...form, offerPrice: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
              <input
                type="checkbox"
                checked={form.isDealOfTheDay}
                onChange={(e) => setForm({ ...form, isDealOfTheDay: e.target.checked })}
              />
              Feature as Deal of the Day
              {hasActiveDeal && form.isDealOfTheDay && (
                <span className="text-[11px] text-red-dark">(replaces the current one)</span>
              )}
            </label>
          </div>
          <div className="col-span-2">
            {formError && <div className="text-[12.5px] text-red-dark mb-2">{formError}</div>}
            <button
              onClick={createOffer}
              disabled={saving}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create offer"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : offers.length === 0 ? (
        <div className="text-sm text-ink-soft">No offers yet.</div>
      ) : (
        <div className="space-y-2.5">
          {offers.map((o) => (
            <div key={o.id} className="border border-line rounded-xl bg-card px-4 py-3.5 flex items-center gap-4 flex-wrap">
              <div className="min-w-[160px]">
                <div className="font-semibold text-[14px]">{o.product_name}</div>
                <div className="text-[11.5px] text-ink-soft">{o.pack_size}</div>
              </div>
              <div className="text-[12.5px] text-ink-soft flex-1">
                ₹{o.offer_price}
                {o.variant_price != null && (
                  <span className="line-through ml-1.5 opacity-70">₹{o.variant_price}</span>
                )}
                {o.is_deal_of_the_day && (
                  <span className="ml-2 text-[10.5px] font-bold uppercase tracking-wide text-gold">
                    ⚡ Deal of the Day
                  </span>
                )}
              </div>
              <button
                onClick={() => toggleActive(o.id, !o.active)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide ${
                  o.active ? "bg-[#DFEFD3] text-[#3A6620]" : "bg-[#F4DADA] text-[#8A2A2A]"
                }`}
              >
                {o.active ? "Active" : "Disabled"}
              </button>
              <button
                onClick={() => removeOffer(o.id)}
                className="text-[11.5px] text-ink-soft underline hover:text-red-dark"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
