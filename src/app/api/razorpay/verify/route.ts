import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isNonEmptyString } from "@/lib/validate";
import { rateLimitShared, getClientKey } from "@/lib/rateLimit";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { razorpay } from "@/lib/razorpay";
import { quoteOrder, PricingError } from "@/lib/serverPricing";
import { placeOrder, parseCustomer } from "@/lib/placeOrder";
import { logEvent } from "@/lib/events";

export async function POST(req: NextRequest) {
  if (!(await rateLimitShared(`razorpay-verify:${getClientKey(req)}`, 10, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Please sign in before placing an order." }, { status: 401 });
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (
      !isNonEmptyString(razorpay_order_id, 100) ||
      !isNonEmptyString(razorpay_payment_id, 100) ||
      !isNonEmptyString(razorpay_signature, 200)
    ) {
      return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
    }

    // 1. Signature proves the payment came from Razorpay (timing-safe compare).
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(razorpay_signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    // 2. Idempotency: the same payment can only ever create one order.
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id, user_id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle();
    if (existing) {
      if (existing.user_id !== userId) {
        return NextResponse.json({ error: "This payment has already been used." }, { status: 409 });
      }
      return NextResponse.json({ orderId: existing.id, pointsRedeemed: 0, duplicate: true }, { status: 200 });
    }

    const customer = parseCustomer(body);
    if (!customer.ok) return NextResponse.json({ error: customer.error }, { status: 400 });
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
      return NextResponse.json({ error: "Invalid cart items." }, { status: 400 });
    }

    // 3. Re-price the cart and bind it to what Razorpay actually charged
    //    for THIS Razorpay order, created for THIS user.
    const rzpOrder: any = await razorpay.orders.fetch(razorpay_order_id);
    if (rzpOrder?.notes?.user_id !== userId) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const quote = await quoteOrder({
      userId,
      items: body.items.map((i: any) => ({ productId: String(i?.productId ?? ""), variantId: i?.variantId, qty: i?.qty })),
      couponCode: typeof body.couponCode === "string" ? body.couponCode : null,
      redeemPoints: typeof body.redeemedPoints === "number" ? body.redeemedPoints : 0
    });

    if (Number(rzpOrder.amount) !== Math.round(quote.total * 100)) {
      await logEvent("payment_mismatch", { razorpay_order_id, razorpay_payment_id, paid: rzpOrder.amount, expected: Math.round(quote.total * 100) });
      console.error("Paid amount does not match recomputed total", {
        razorpay_order_id,
        razorpay_payment_id,
        paid: rzpOrder.amount,
        expected: Math.round(quote.total * 100)
      });
      return NextResponse.json(
        { error: "Your payment was received but the order total changed. Please contact us with your payment ID: " + razorpay_payment_id },
        { status: 409 }
      );
    }

    const result = await placeOrder({
      userId,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      quote,
      paymentMethod: "Razorpay",
      razorpay: { orderId: razorpay_order_id, paymentId: razorpay_payment_id }
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof PricingError) {
      return NextResponse.json(
        { error: `${err.message} If you were charged, please contact us with your payment ID.` },
        { status: err.status }
      );
    }
    console.error("Payment verification / order creation failed", err);
    return NextResponse.json({ error: "Could not confirm your order. Please contact us." }, { status: 500 });
  }
}
