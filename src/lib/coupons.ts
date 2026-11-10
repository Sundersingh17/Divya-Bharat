import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type CouponResult =
  | { ok: true; code: string; type: string; discount: number; freeShipping: boolean }
  | { ok: false; error: string; status: number };

// Single source of truth for coupon rules, used by both the public
// /api/coupons/validate endpoint and the authoritative order pricing.
export async function validateCoupon(rawCode: string, subtotal: number): Promise<CouponResult> {
  const { data: coupon, error } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", rawCode.trim().toUpperCase())
    .maybeSingle();

  if (error || !coupon || !coupon.is_active) {
    return { ok: false, error: "That code isn't valid.", status: 404 };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (coupon.valid_from && today < coupon.valid_from) {
    return { ok: false, error: "That code isn't active yet.", status: 400 };
  }
  if (coupon.valid_to && today > coupon.valid_to) {
    return { ok: false, error: "That code has expired.", status: 400 };
  }
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { ok: false, error: "That code has reached its usage limit.", status: 400 };
  }
  if (subtotal < coupon.min_order_value) {
    return { ok: false, error: `Add ₹${coupon.min_order_value - subtotal} more to use this code.`, status: 400 };
  }

  let discount = 0;
  let freeShipping = false;
  if (coupon.type === "percent") discount = Math.round(subtotal * (coupon.value / 100));
  else if (coupon.type === "flat") discount = Math.min(coupon.value, subtotal);
  else if (coupon.type === "free_shipping") freeShipping = true;

  return { ok: true, code: coupon.code, type: coupon.type, discount, freeShipping };
}
