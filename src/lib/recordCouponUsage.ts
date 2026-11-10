import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Best-effort, non-atomic increment — fine at this order volume. If two
// orders race on the exact same coupon in the same instant, the usage
// count could undercount by one; acceptable tradeoff to avoid needing a
// database stored procedure for an MVP.
export async function recordCouponUsage(code: string | null | undefined) {
  if (!code) return;
  try {
    const { data } = await supabaseAdmin.from("coupons").select("used_count").eq("code", code).maybeSingle();
    if (data) {
      await supabaseAdmin.from("coupons").update({ used_count: data.used_count + 1 }).eq("code", code);
    }
  } catch (err) {
    console.error("Failed to record coupon usage", err);
  }
}
