"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import Spinner from "@/components/Spinner";

export default function ReferralSection() {
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [successfulReferrals, setSuccessfulReferrals] = useState(0);
  const [tier, setTier] = useState("Bronze");
  const [currentRewardPct, setCurrentRewardPct] = useState(15);
  const [nextTier, setNextTier] = useState<{ name: string; rewardPct: number; referralsToGo: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/referral/code", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((data) => {
        setCode(data.code ?? null);
        setSuccessfulReferrals(data.successfulReferrals ?? 0);
        setTier(data.tier ?? "Bronze");
        setCurrentRewardPct(data.currentRewardPct ?? 15);
        setNextTier(data.nextTier ?? null);
        setLoading(false);
      });
  }, [accessToken]);

  const referralUrl =
    code && typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : "";

  function copyLink() {
    navigator.clipboard.writeText(referralUrl);
    showToast("Link copied!");
  }

  const whatsappMessage = `Check out Divya Bharat — cold-pressed oils, chhatua, dal and spices from Odisha, delivered to your door: ${referralUrl}`;

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="bg-card border border-line rounded-xl px-5 py-5 mb-5">
        <div className="text-[13px] font-semibold text-ink mb-2">Your referral link</div>
        <div className="flex gap-2">
          <input
            readOnly
            value={referralUrl}
            className="flex-1 border border-line rounded-lg px-3 py-2.5 text-[12.5px] bg-cream font-mono"
          />
          <button
            onClick={copyLink}
            className="rounded-lg px-4 py-2.5 text-[12.5px] font-semibold border border-line hover:border-gold"
          >
            Copy
          </button>
        </div>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-center rounded-lg py-2.5 text-[12.5px] font-semibold bg-[#25D366] text-white hover:opacity-90"
        >
          Share on WhatsApp
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-cream border border-line rounded-xl px-4 py-3.5 text-center">
          <div className="font-semibold text-lg tabular-nums text-red-dark">{successfulReferrals}</div>
          <div className="text-[10.5px] text-ink-soft uppercase tracking-wide mt-0.5">
            Successful referrals
          </div>
        </div>
        <div className="bg-cream border border-line rounded-xl px-4 py-3.5 text-center">
          <div className="font-serif font-semibold text-lg text-gold">{tier}</div>
          <div className="text-[10.5px] text-ink-soft uppercase tracking-wide mt-0.5">
            Your tier — {currentRewardPct}% reward
          </div>
        </div>
      </div>

      <div className="text-[12.5px] text-ink-soft leading-relaxed bg-cream rounded-xl px-4 py-3.5">
        When someone signs up with your link and places their first order, you get a{" "}
        <b className="text-ink">{currentRewardPct}% off coupon</b> emailed to you automatically, at your
        current <b className="text-ink">{tier}</b> tier. There's no limit to how many friends you can refer.
        {nextTier && (
          <>
            {" "}
            Refer <b className="text-ink">{nextTier.referralsToGo}</b> more to reach{" "}
            <b className="text-ink">{nextTier.name}</b> ({nextTier.rewardPct}% rewards).
          </>
        )}
      </div>
    </div>
  );
}
