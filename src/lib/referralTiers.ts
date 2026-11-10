// Referral reward escalates with how many successful referrals someone
// has already made — minReferrals is the count of PRIOR successful
// referrals needed to be in that tier for the NEXT one. So someone's
// 1st referral is Bronze (15%), their 4th is Silver (20%), their 7th
// onward is Gold (25%). Ordered lowest to highest.
export const REFERRAL_TIERS = [
  { name: "Bronze", minReferrals: 0, rewardPct: 15 },
  { name: "Silver", minReferrals: 3, rewardPct: 20 },
  { name: "Gold", minReferrals: 6, rewardPct: 25 }
] as const;

export type ReferralTier = (typeof REFERRAL_TIERS)[number];

// priorSuccessfulReferrals = how many this person has ALREADY had
// rewarded before the one currently being evaluated.
export function tierForCount(priorSuccessfulReferrals: number): ReferralTier {
  let current: ReferralTier = REFERRAL_TIERS[0];
  for (const tier of REFERRAL_TIERS) {
    if (priorSuccessfulReferrals >= tier.minReferrals) current = tier;
  }
  return current;
}

// What's needed to reach the next tier up, or null if already at the top.
export function nextTier(priorSuccessfulReferrals: number): { tier: ReferralTier; referralsToGo: number } | null {
  const upcoming = REFERRAL_TIERS.find((t) => t.minReferrals > priorSuccessfulReferrals);
  if (!upcoming) return null;
  return { tier: upcoming, referralsToGo: upcoming.minReferrals - priorSuccessfulReferrals };
}
