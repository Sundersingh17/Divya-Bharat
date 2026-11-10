import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { rateLimitShared, getClientKey } from "@/lib/rateLimit";
import { isNonEmptyString } from "@/lib/validate";
import { reversePointsForOrder } from "@/lib/loyaltyLedger";
import { restoreStockForOrder } from "@/lib/stock";
import { razorpay } from "@/lib/razorpay";
import { logEvent } from "@/lib/events";
import { sendOrderStatusEmail, sendAdminAlertEmail } from "@/lib/email";

// Customer self-service cancellation, matching the published policy:
// free until the order is marked "Packed".
export async function POST(req: NextRequest) {
  if (!(await rateLimitShared(`orders-cancel:${getClientKey(req)}`, 5, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!isNonEmptyString(body?.orderId, 40)) return NextResponse.json({ error: "Missing order." }, { status: 400 });
  const orderId = body.orderId.trim().toUpperCase();

  // Atomic: only flips if it's still "Placed" AND belongs to this customer.
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .update({ status: "Cancelled" })
    .eq("id", orderId)
    .eq("user_id", userId)
    .eq("status", "Placed")
    .select("id, email, customer_name, total, payment_method, payment_status, razorpay_payment_id")
    .maybeSingle();
  if (error) {
    console.error("Cancel failed", error);
    return NextResponse.json({ error: "Could not cancel the order." }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json(
      { error: "This order can no longer be cancelled online (it may already be packed). Please contact us from the Help page." },
      { status: 409 }
    );
  }

  await supabaseAdmin.from("order_status_history").insert({ order_id: orderId, status: "Cancelled" });
  await reversePointsForOrder(orderId);
  await restoreStockForOrder(orderId);

  // Refund online payments automatically; if that fails, flag it for the business.
  let refund: "none" | "refunded" | "pending" = "none";
  if (order.payment_method === "Razorpay" && order.payment_status === "paid" && order.razorpay_payment_id) {
    try {
      await razorpay.payments.refund(order.razorpay_payment_id, { amount: Math.round(Number(order.total) * 100) });
      await supabaseAdmin.from("orders").update({ payment_status: "refunded" }).eq("id", orderId);
      refund = "refunded";
    } catch (err: any) {
      console.error("Auto-refund failed", err);
      await supabaseAdmin.from("orders").update({ payment_status: "refund_pending" }).eq("id", orderId);
      await logEvent("order_failed", { stage: "auto_refund", orderId, message: String(err?.error?.description ?? err?.message ?? err) });
      await sendAdminAlertEmail(`Refund needed: ${orderId}`, `<p>Order <b>${orderId}</b> was cancelled by the customer but the automatic refund of ₹${order.total} failed. Please refund payment ${order.razorpay_payment_id} manually in Razorpay.</p>`);
      refund = "pending";
    }
  }

  if (order.email) sendOrderStatusEmail({ to: order.email, orderId, customerName: order.customer_name, status: "Cancelled" });
  await sendAdminAlertEmail(`Order cancelled by customer: ${orderId}`, `<p>${order.customer_name} cancelled order <b>${orderId}</b> (₹${order.total}, ${order.payment_method}).</p>`);

  return NextResponse.json({ ok: true, refund });
}
