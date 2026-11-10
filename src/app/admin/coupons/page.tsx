"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type Coupon = {
  code: string;
  type: string;
  value: number;
  min_order_value: number;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
};

const emptyForm = { code: "", type: "percent", value: "", min_order_value: "0", usage_limit: "" };

export default function AdminCouponsPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
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
    const res = await fetch("/api/admin-coupons", { headers: authHeaders });
    if (res.ok) {
      setCoupons((await res.json()).coupons ?? []);
    }
    setLoading(false);
  }

  async function toggleActive(code: string, is_active: boolean) {
    setCoupons((prev) => prev.map((c) => (c.code === code ? { ...c, is_active } : c)));
    await fetch("/api/admin-coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ code, is_active })
    });
  }

  async function createCoupon() {
    setFormError("");
    if (!form.code || (form.type !== "free_shipping" && !form.value)) {
      setFormError("Please fill in code and value.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin-coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        code: form.code.toUpperCase(),
        type: form.type,
        value: parseFloat(form.value) || 0,
        min_order_value: parseFloat(form.min_order_value) || 0,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null
      })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setFormError(data.error || "Could not create coupon.");
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
        <h2 className="font-serif text-red-dark text-2xl mb-1">Coupons</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">
            Sign out
          </button>
          <Link href="/" className="text-sm text-ink-soft underline">
            Back to store
          </Link>
        </div>
      </div>

      <AdminNav active="/admin/coupons" />

      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-5 text-[13px] font-semibold text-red-dark border border-line rounded-full px-4 py-2 hover:border-gold transition-colors"
      >
        {showForm ? "Cancel" : "+ New coupon"}
      </button>

      {showForm && (
        <div className="bg-card border border-line rounded-xl px-5 py-5 mb-6 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. FESTIVE20"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
            >
              <option value="percent">% off</option>
              <option value="flat">Flat ₹ off</option>
              <option value="free_shipping">Free shipping</option>
            </select>
          </div>
          {form.type !== "free_shipping" && (
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                Value {form.type === "percent" ? "(%)" : "(₹)"}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
              />
            </div>
          )}
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Min order value (₹)</label>
            <input
              type="number"
              value={form.min_order_value}
              onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Usage limit (blank = unlimited)</label>
            <input
              type="number"
              value={form.usage_limit}
              onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-cream"
            />
          </div>
          <div className="col-span-2">
            {formError && <div className="text-[12.5px] text-red-dark mb-2">{formError}</div>}
            <button
              onClick={createCoupon}
              disabled={saving}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create coupon"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : coupons.length === 0 ? (
        <div className="text-sm text-ink-soft">No coupons yet.</div>
      ) : (
        <div className="space-y-2.5">
          {coupons.map((c) => (
            <div key={c.code} className="border border-line rounded-xl bg-card px-4 py-3.5 flex items-center gap-4 flex-wrap">
              <div className="font-mono font-semibold text-[14px] min-w-[120px]">{c.code}</div>
              <div className="text-[12.5px] text-ink-soft flex-1">
                {c.type === "percent" && `${c.value}% off`}
                {c.type === "flat" && `₹${c.value} off`}
                {c.type === "free_shipping" && "Free shipping"}
                {c.min_order_value > 0 && ` · min ₹${c.min_order_value}`}
                {" · "}
                {c.used_count} used{c.usage_limit ? ` / ${c.usage_limit}` : ""}
              </div>
              <button
                onClick={() => toggleActive(c.code, !c.is_active)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide ${
                  c.is_active ? "bg-[#DFEFD3] text-[#3A6620]" : "bg-[#F4DADA] text-[#8A2A2A]"
                }`}
              >
                {c.is_active ? "Active" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
