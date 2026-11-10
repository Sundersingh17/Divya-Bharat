"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useActiveMembership } from "@/lib/useActiveMembership";
import { MEMBERSHIP_PLANS, MEMBERSHIP_DISCOUNT_PCT, MembershipPlanId } from "@/lib/membership";
import Spinner from "@/components/Spinner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function MembershipPage() {
  const { user, accessToken } = useAuth();
  const { membership, loading, isMember } = useActiveMembership();
  const { showToast } = useToast();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanId>("yearly");
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [paying, setPaying] = useState(false);

  // Covers the case where the Razorpay script was already loaded by a
  // previous page (e.g. checkout) before navigating here client-side —
  // in that case the <Script> component's onLoad may not fire again even
  // though window.Razorpay is already available. Check directly on mount.
  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) {
      setRazorpayReady(true);
    }
  }, []);

  async function waitForRazorpay(timeoutMs = 3000): Promise<boolean> {
    if (typeof window !== "undefined" && window.Razorpay) return true;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 200));
      if (typeof window !== "undefined" && window.Razorpay) return true;
    }
    return false;
  }

  async function joinClub() {
    if (!user) {
      showToast("Sign in first to join the club.", "err");
      router.push("/account");
      return;
    }
    const ready = razorpayReady || (await waitForRazorpay());
    if (!ready) {
      showToast(
        "Could not load the payment window. Please disable any ad blocker for this site and refresh the page.",
        "err"
      );
      return;
    }
    setPaying(true);
    try {
      const orderRes = await fetch("/api/membership/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ plan: selectedPlan })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Could not start payment");

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "Divya Bharat Club",
        description: `${selectedPlan === "monthly" ? "Monthly" : "Yearly"} membership`,
        prefill: { contact: user.phone ?? undefined },
        theme: { color: "#B85C38" },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/membership/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: selectedPlan
              })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
            showToast("Welcome to Divya Bharat Club!");
            router.refresh();
            window.location.reload();
          } catch (err: any) {
            showToast(err.message || "Payment succeeded but activation failed. Please contact us.", "err");
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) }
      });
      rzp.open();
    } catch (err: any) {
      showToast(err.message || "Could not start payment.", "err");
      setPaying(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayReady(true)} />
      <Header categories={[]} />

      <div className="max-w-xl mx-auto px-5 py-12 pb-16">
        <div className="text-center mb-9">
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[.16em] uppercase text-gold font-semibold mb-3">
            <span className="w-5 h-[1.5px] bg-gold" /> Membership <span className="w-5 h-[1.5px] bg-gold" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-red-dark mb-3">Divya Bharat Club</h1>
          <p className="text-[14px] text-ink-soft max-w-sm mx-auto leading-relaxed">
            Free delivery on every order, plus {MEMBERSHIP_DISCOUNT_PCT}% off everything you buy —
            oils, chhatua, dal, all of it.
          </p>
        </div>

        {loading ? (
          <Spinner />
        ) : isMember && membership ? (
          <div className="bg-[#EBF0E4] border border-sage/30 rounded-2xl px-6 py-6 text-center animate-fadeSlideUp">
            <div className="text-sage font-semibold text-[15px] mb-1.5">
              ✓ You're a Divya Bharat Club member
            </div>
            <p className="text-[13px] text-ink-soft">
              Valid until {new Date(membership.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {MEMBERSHIP_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative text-left border rounded-xl px-4 py-4 transition-colors ${
                    selectedPlan === plan.id ? "border-red bg-[#FBEFEA]" : "border-line bg-card"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 right-3 bg-gold text-cream text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {plan.badge}
                    </span>
                  )}
                  <div className="font-serif font-semibold text-[15px] text-ink mb-1">{plan.label}</div>
                  <div className="text-xl font-bold tabular-nums text-red-dark">₹{plan.price}</div>
                  <div className="text-[11px] text-ink-soft mt-0.5">
                    {plan.id === "monthly" ? "per month" : "per year"}
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-card border border-line rounded-xl px-5 py-5 mb-6 space-y-3">
              {[
                "Free delivery on every order, no minimum",
                `${MEMBERSHIP_DISCOUNT_PCT}% off every product, every time`,
                "Cancel anytime — no long-term lock-in"
              ].map((b) => (
                <div key={b} className="flex items-center gap-2.5 text-[13px] text-ink">
                  <span className="text-sage">✓</span> {b}
                </div>
              ))}
            </div>

            <button
              onClick={joinClub}
              disabled={paying}
              className="w-full py-3.5 rounded-full bg-red text-[#FBF6EE] font-semibold text-sm hover:bg-red-dark disabled:opacity-60 transition-colors"
            >
              {paying ? "Processing…" : `Join for ₹${MEMBERSHIP_PLANS.find((p) => p.id === selectedPlan)?.price}`}
            </button>
            <p className="text-[11px] text-ink-soft text-center mt-3">
              Test mode — use Razorpay test card 4111 1111 1111 1111, any future
              expiry, any CVV. No real money is charged.
            </p>
          </>
        )}
      </div>

      <Footer />
    </>
  );
}
