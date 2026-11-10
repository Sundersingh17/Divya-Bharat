import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getPlan } from "@/lib/membership";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  if (!rateLimit(`membership-create:${getClientKey(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Please sign in to join." }, { status: 401 });
  }

  try {
    const { plan } = await req.json();
    const planConfig = getPlan(plan);
    if (!planConfig) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const order = await razorpay.orders.create({
      amount: planConfig.price * 100,
      currency: "INR",
      receipt: `membership_${Date.now()}`,
      notes: { user_id: userId, plan: planConfig.id }
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error("Membership order creation failed", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
