import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString } from "@/lib/validate";
import { sendOrderStatusEmail } from "@/lib/email";
import { sendOrderStatusWhatsApp } from "@/lib/whatsapp";
import { reversePointsForOrder } from "@/lib/loyaltyLedger";
import { restoreStockForOrder } from "@/lib/stock";
import { SITE_URL, SITE_URL_IS_PLACEHOLDER } from "@/lib/site";

const VALID_STATUSES = ["Placed", "Packed", "Shipped", "Delivered", "Cancelled"];
// Only these transitions are worth emailing the customer about — skip
// "Packed" (not customer-meaningful) to avoid over-notifying.
const NOTIFY_STATUSES = ["Shipped", "Delivered", "Cancelled"];

export async function GET(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ orders: data });
}

export async function PATCH(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { orderId, status } = body;

  // Tracking-only update (no status change): { orderId, courier, trackingNumber, trackingUrl }
  if (status === undefined && isNonEmptyString(orderId, 50)) {
    const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
    const url = clean(body.trackingUrl, 500);
    if (url && !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "Tracking link must start with http:// or https://" }, { status: 400 });
    }
    const { error: tErr } = await supabaseAdmin
      .from("orders")
      .update({ courier: clean(body.courier, 80), tracking_number: clean(body.trackingNumber, 80), tracking_url: url })
      .eq("id", orderId);
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!isNonEmptyString(orderId, 50) || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "orderId and a valid status are required" }, { status: 400 });
  }
  const { data: updated, error } = await supabaseAdmin
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("email, phone, customer_name, courier, tracking_number, tracking_url")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await supabaseAdmin.from("order_status_history").insert({ order_id: orderId, status });

  if (status === "Cancelled") {
    await reversePointsForOrder(orderId);
    // Put reserved stock back (only for orders that actually reserved it).
    await restoreStockForOrder(orderId);
  }

  // On delivery, invite a genuine review per product (verified-purchase is
  // still decided server-side when the review is submitted). Skipped until
  // a real site URL is configured so we never email placeholder links.
  let reviewLinks: { name: string; url: string }[] | undefined;
  if (status === "Delivered" && !SITE_URL_IS_PLACEHOLDER) {
    const { data: lines } = await supabaseAdmin.from("order_items").select("product_id, product_name").eq("order_id", orderId);
    const seen = new Set<string>();
    reviewLinks = (lines ?? [])
      .filter((l: any) => l.product_id && !seen.has(l.product_id) && seen.add(l.product_id))
      .map((l: any) => ({ name: l.product_name, url: `${SITE_URL}/product/${l.product_id}#reviews` }));
  }

  if (updated?.email && NOTIFY_STATUSES.includes(status)) {
    sendOrderStatusEmail({
      to: updated.email,
      orderId,
      customerName: updated.customer_name,
      status,
      reviewLinks,
      tracking: { courier: updated.courier, number: updated.tracking_number, url: updated.tracking_url }
    });
  }
  if (updated?.phone && NOTIFY_STATUSES.includes(status)) {
    sendOrderStatusWhatsApp({
      toPhone: updated.phone,
      orderId,
      customerName: updated.customer_name,
      status
    });
  }

  return NextResponse.json({ ok: true });
}
