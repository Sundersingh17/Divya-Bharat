import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { rateLimitShared, getClientKey } from "@/lib/rateLimit";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { quoteOrder, totalsDiffer, PricingError } from "@/lib/serverPricing";

// The amount charged is computed HERE from the cart contents — a client
// supplied "amount" is ignored entirely.
export async function POST(req: NextRequest) {
  if (!(await rateLimitShared(`razorpay-create:${getClientKey(req)}`, 10, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Please sign in before placing an order." }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
      return NextResponse.json({ error: "Your cart looks invalid. Please refresh and try again." }, { status: 400 });
    }
    const quote = await quoteOrder({
      userId,
      items: body.items.map((i: any) => ({ productId: String(i?.productId ?? ""), variantId: i?.variantId, qty: i?.qty })),
      couponCode: typeof body.couponCode === "string" ? body.couponCode : null,
      redeemPoints: typeof body.redeemedPoints === "number" ? body.redeemedPoints : 0
    });

    if (typeof body.total === "number" && totalsDiffer(body.total, quote.total)) {
      return NextResponse.json(
        { error: `Prices or discounts changed. Your updated total is ₹${quote.total}. Please review and try again.`, serverTotal: quote.total },
        { status: 409 }
      );
    }

    if (quote.total < 1 || quote.total > 200000) {
      return NextResponse.json({ error: "Invalid order amount." }, { status: 400 });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(quote.total * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { user_id: userId }
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      serverTotal: quote.total,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    });
  } catch (err) {
    if (err instanceof PricingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Razorpay order creation failed", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
