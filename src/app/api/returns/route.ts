import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { isNonEmptyString, isValidPhone, sanitizeText } from "@/lib/validate";
import { sendAdminReturnRequestEmail } from "@/lib/email";
import { REASONS } from "@/lib/returnReasons";

// A return can only be requested once an order has actually arrived —
// there's nothing to "return" before that, and Cancelled orders have
// their own (already-built) reversal path via admin order cancellation.
const RETURNABLE_STATUS = "Delivered";

export async function GET(req: NextRequest) {
  if (!rateLimit(`returns-lookup:${getClientKey(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }
  const phone = req.nextUrl.searchParams.get("phone");
  const userId = await getUserIdFromRequest(req);

  let orderIds: string[] = [];
  if (userId) {
    const { data } = await supabaseAdmin.from("orders").select("id").eq("user_id", userId);
    orderIds = (data ?? []).map((o) => o.id);
  } else if (isValidPhone(phone)) {
    const { data } = await supabaseAdmin.from("orders").select("id").eq("phone", phone!.trim());
    orderIds = (data ?? []).map((o) => o.id);
  } else {
    return NextResponse.json({ error: "Sign in, or provide the phone number used on the order." }, { status: 400 });
  }

  if (orderIds.length === 0) return NextResponse.json({ returns: [] });

  const { data: returns, error } = await supabaseAdmin
    .from("return_requests")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load return requests." }, { status: 500 });
  return NextResponse.json({ returns });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`returns-create:${getClientKey(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const { orderId, phone, reason, comments, photoUrls } = await req.json();
  if (!isNonEmptyString(orderId, 50) || !REASONS.includes(reason)) {
    return NextResponse.json({ error: "orderId and a valid reason are required." }, { status: 400 });
  }
  if (comments && typeof comments === "string" && comments.length > 500) {
    return NextResponse.json({ error: "Comments are too long (500 characters max)." }, { status: 400 });
  }
  const urls = Array.isArray(photoUrls) ? photoUrls.filter((u) => typeof u === "string").slice(0, 3) : [];

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, phone, customer_name, status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Ownership check — a logged-in session must own the order, otherwise
  // the phone on the request must match the phone on the order (same
  // guest-verification pattern as the /orders lookup page).
  const userId = await getUserIdFromRequest(req);
  const ownsViaSession = userId && order.user_id === userId;
  const ownsViaPhone = isValidPhone(phone) && order.phone === phone.trim();
  if (!ownsViaSession && !ownsViaPhone) {
    return NextResponse.json(
      { error: "We couldn't verify this order. Please check the order ID and phone number." },
      { status: 403 }
    );
  }

  if (order.status !== RETURNABLE_STATUS) {
    return NextResponse.json(
      { error: `Returns can only be requested for delivered orders. This order is currently: ${order.status}.` },
      { status: 400 }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("return_requests")
    .select("id, status")
    .eq("order_id", orderId)
    .in("status", ["Requested", "Approved"]);
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "A return request is already in progress for this order." }, { status: 409 });
  }

  const { error } = await supabaseAdmin.from("return_requests").insert({
    order_id: orderId,
    user_id: order.user_id ?? null,
    reason,
    comments: comments ? sanitizeText(comments) : null,
    photo_urls: urls
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  sendAdminReturnRequestEmail({
    orderId,
    customerName: order.customer_name,
    reason,
    comments: comments || undefined
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
