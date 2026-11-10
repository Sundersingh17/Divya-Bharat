import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { isNonEmptyString } from "@/lib/validate";

// Returns one order, only to the signed-in customer who owns it. The
// confirmation page trusts nothing but this server-side record.
export async function GET(req: NextRequest) {
  if (!rateLimit(`orders-confirm:${getClientKey(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Please sign in to view this order." }, { status: 401 });

  const orderId = req.nextUrl.searchParams.get("order");
  if (!isNonEmptyString(orderId, 40)) return NextResponse.json({ error: "Missing order." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, status, payment_method, payment_status, subtotal, shipping_fee, total, discount_amount, coupon_code, address, customer_name, email, created_at, order_items(product_name, pack_size, qty, price)")
    .eq("id", orderId.trim().toUpperCase())
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load the order." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order: data });
}
