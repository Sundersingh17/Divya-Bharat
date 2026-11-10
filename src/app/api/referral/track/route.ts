import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { isNonEmptyString } from "@/lib/validate";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { Resend } from "resend";
import { tierForCount } from "@/lib/referralTiers";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "Divya Bharat <onboarding@resend.dev>";

function generateCouponCode() {
  return "REF" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`referral-track:${getClientKey(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const referredUserId = await getUserIdFromRequest(req);
  if (!referredUserId) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const { referralCode, orderId } = await req.json();
  if (!isNonEmptyString(referralCode, 50)) {
    return NextResponse.json({ error: "referralCode is required." }, { status: 400 });
  }

  try {
    // 1. Look up the referrer by code.
    const { data: codeRow } = await supabaseAdmin
      .from("referral_codes")
      .select("user_id")
      .eq("code", referralCode.toUpperCase())
      .maybeSingle();

    if (!codeRow) {
      return NextResponse.json({ ok: false, reason: "Invalid referral code." });
    }
    if (codeRow.user_id === referredUserId) {
      return NextResponse.json({ ok: false, reason: "Can't refer yourself." });
    }

    // 2. Confirm this is genuinely the referred user's first order.
    const { count: orderCount } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", referredUserId);

    if ((orderCount ?? 0) > 1) {
      return NextResponse.json({ ok: false, reason: "Not a first order." });
    }

    // 3. Record the referral (unique constraint on referred_user_id
    // prevents a user from being credited to more than one referrer).
    const { error: insertError } = await supabaseAdmin.from("referrals").insert({
      referrer_user_id: codeRow.user_id,
      referred_user_id: referredUserId,
      referred_order_id: isNonEmptyString(orderId, 50) ? orderId : null
    });

    if (insertError) {
      // Most likely: this user was already referred once before.
      return NextResponse.json({ ok: false, reason: "Already referred." });
    }

    // 4. Issue a reward coupon to the referrer, at whatever tier they've
    // earned from their prior successful referrals (this one doesn't
    // count toward its own tier — it's rewarded at the tier they were
    // already in when it converted).
    const { count: priorCount } = await supabaseAdmin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_user_id", codeRow.user_id)
      .eq("reward_issued", true);

    const tier = tierForCount(priorCount ?? 0);
    const rewardCode = generateCouponCode();
    await supabaseAdmin.from("coupons").insert({
      code: rewardCode,
      type: "percent",
      value: tier.rewardPct,
      min_order_value: 0,
      usage_limit: 1
    });
    await supabaseAdmin
      .from("referrals")
      .update({ reward_issued: true, reward_coupon_code: rewardCode, tier: tier.name })
      .eq("referrer_user_id", codeRow.user_id)
      .eq("referred_user_id", referredUserId);

    // 5. Email the referrer if we have an address on file for them
    // (from a past order — accounts are phone-only, no email at signup).
    if (resend) {
      const { data: pastOrder } = await supabaseAdmin
        .from("orders")
        .select("email, customer_name")
        .eq("user_id", codeRow.user_id)
        .not("email", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pastOrder?.email) {
        try {
          await resend.emails.send({
            from: FROM_ADDRESS,
            to: pastOrder.email,
            subject: "Your friend just ordered — here's your reward!",
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                <h2 style="color:#B85C38;">🎉 Referral reward unlocked</h2>
                <p>Hi ${pastOrder.customer_name}, someone you referred to Divya Bharat just placed their
                first order. As a thank you, here's a coupon for your next one:</p>
                <p style="font-size:20px;font-weight:bold;background:#FBF3E0;color:#C08A3E;
                   padding:12px 20px;border-radius:8px;display:inline-block;">${rewardCode}</p>
                <p style="color:#666;font-size:13px;">${tier.rewardPct}% off, one-time use. You're at ${tier.name} tier.</p>
              </div>
            `
          });
        } catch (err) {
          console.error("Failed to send referral reward email", err);
        }
      }
    }

    return NextResponse.json({ ok: true, rewardCode });
  } catch (err) {
    console.error("Referral tracking failed", err);
    return NextResponse.json({ ok: false, reason: "Server error." });
  }
}
