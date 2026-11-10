import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { tierForCount, nextTier } from "@/lib/referralTiers";

function generateCode() {
  return "DB" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function GET(req: NextRequest) {
  if (!rateLimit(`referral-code:${getClientKey(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { data: existing } = await supabaseAdmin
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  let code = existing?.code;

  if (!code) {
    code = generateCode();
    // Extremely unlikely to collide given the random space, but retry
    // once with a fresh code if it does (unique constraint would reject it).
    const { error } = await supabaseAdmin.from("referral_codes").insert({ user_id: userId, code });
    if (error) {
      code = generateCode();
      await supabaseAdmin.from("referral_codes").insert({ user_id: userId, code });
    }
  }

  const { count } = await supabaseAdmin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_user_id", userId)
    .eq("reward_issued", true);

  const successfulReferrals = count ?? 0;
  const tier = tierForCount(successfulReferrals);
  const next = nextTier(successfulReferrals);

  return NextResponse.json({
    code,
    successfulReferrals,
    tier: tier.name,
    currentRewardPct: tier.rewardPct,
    nextTier: next ? { name: next.tier.name, rewardPct: next.tier.rewardPct, referralsToGo: next.referralsToGo } : null
  });
}
