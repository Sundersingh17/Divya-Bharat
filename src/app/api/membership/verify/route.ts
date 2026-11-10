import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPlan } from "@/lib/membership";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { isNonEmptyString } from "@/lib/validate";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { razorpay } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  if (!rateLimit(`membership-verify:${getClientKey(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Please sign in to join." }, { status: 401 });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json();

    if (
      !isNonEmptyString(razorpay_order_id, 100) ||
      !isNonEmptyString(razorpay_payment_id, 100) ||
      !isNonEmptyString(razorpay_signature, 200)
    ) {
      return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
    }

    const planConfig = getPlan(plan);
    if (!planConfig) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    // The plan is chosen by the browser, so bind it to what was actually
    // charged on this Razorpay order, and never grant twice for one payment.
    const rzpOrder: any = await razorpay.orders.fetch(razorpay_order_id);
    if (Number(rzpOrder?.amount) !== planConfig.price * 100) {
      return NextResponse.json({ error: "Payment does not match the selected plan. Please contact us." }, { status: 400 });
    }
    const { data: already } = await supabaseAdmin
      .from("memberships")
      .select("user_id, end_date")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle();
    if (already) {
      if (already.user_id !== userId) {
        return NextResponse.json({ error: "This payment has already been used." }, { status: 409 });
      }
      return NextResponse.json({ ok: true, endDate: already.end_date, duplicate: true }, { status: 200 });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planConfig.days);

    const { error } = await supabaseAdmin.from("memberships").insert({
      user_id: userId,
      plan: planConfig.id,
      status: "active",
      amount_paid: planConfig.price,
      razorpay_order_id,
      razorpay_payment_id,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10)
    });

    if (error) throw error;

    return NextResponse.json({ ok: true, endDate: endDate.toISOString().slice(0, 10) }, { status: 201 });
  } catch (err) {
    console.error("Membership verification failed", err);
    return NextResponse.json({ error: "Could not confirm your membership. Please contact us." }, { status: 500 });
  }
}
