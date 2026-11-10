"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OrderTabs, OrderRecord, ACTIVE_STATUSES } from "@/components/OrderList";
import WishlistSection from "@/components/WishlistSection";
import AddressSection from "@/components/AddressSection";
import LoyaltySection from "@/components/LoyaltySection";
import ProfileEditor from "@/components/ProfileEditor";
import ReferralSection from "@/components/ReferralSection";
import { useAuth, OtpChannel } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabaseClient";
import { useActiveMembership } from "@/lib/useActiveMembership";
import Spinner from "@/components/Spinner";

type Step = "identifier" | "otp";
type View = "profile" | "orders" | "wishlist" | "referrals" | "addresses" | "points";

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const { user, loading: authLoading, sendOtp, verifyOtp, signOut } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership, loading: membershipLoading, isMember } = useActiveMembership();

  const [channel, setChannel] = useState<OtpChannel>("phone");
  const [step, setStep] = useState<Step>("identifier");
  const [phone, setPhone] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [view, setView] = useState<View>("profile");

  // Deep links like /account?view=wishlist (from the mobile bottom nav).
  useEffect(() => {
    const v = searchParams.get("view");
    if (v && ["profile", "orders", "wishlist", "referrals", "addresses", "points"].includes(v)) {
      setView(v as View);
    }
  }, [searchParams]);
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const identifier = channel === "phone" ? phone : emailInput;

  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    supabase
      .from("orders")
      .select("*, order_items(*), order_status_history(status, changed_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Failed to load account orders", error);
        setOrders(data ?? []);
        setOrdersLoading(false);
      });
  }, [user]);

  async function handleSendOtp() {
    if (channel === "phone" && !/^[0-9]{10}$/.test(phone.trim())) {
      showToast("Please enter a valid 10-digit phone number.", "err");
      return;
    }
    if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      showToast("Please enter a valid email address.", "err");
      return;
    }
    setSending(true);
    const { error } = await sendOtp(identifier, channel);
    setSending(false);
    if (error) {
      showToast(error, "err");
      return;
    }
    showToast(channel === "phone" ? "Code sent — check your SMS." : "Code sent — check your email.");
    setStep("otp");
  }

  async function handleVerifyOtp() {
    if (!code.trim()) {
      showToast("Enter the code you received.", "err");
      return;
    }
    setVerifying(true);
    const { error } = await verifyOtp(identifier, code.trim(), channel);
    setVerifying(false);
    if (error) {
      showToast(error, "err");
      return;
    }
    showToast("Signed in.");
    const next = searchParams.get("next");
    if (next) router.push(next);
  }

  if (authLoading) {
    return (
      <>
        <Header categories={[]} />
        <Spinner />
        <Footer />
      </>
    );
  }

  const activeCount = orders?.filter((o) => ACTIVE_STATUSES.includes(o.status)).length ?? 0;
  const totalSpent = orders?.reduce((sum, o) => sum + o.total, 0) ?? 0;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : null;

  return (
    <>
      <Header categories={[]} />

      <div className="max-w-xl mx-auto px-5 py-10 pb-16">
        {!user ? (
          <>
            <h2 className="font-serif text-red-dark text-2xl mb-1.5">Sign in</h2>
            <p className="text-[13.5px] text-ink-soft mb-5">
              Sign in to save your order history and check out — a verified sign-in is
              required before placing an order.
            </p>

            {step === "identifier" && (
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setChannel("phone")}
                  className={`text-[12.5px] font-semibold px-3.5 py-2 rounded-full border transition-colors ${
                    channel === "phone" ? "bg-ink text-cream border-ink" : "border-line text-ink-soft"
                  }`}
                >
                  Phone
                </button>
                <button
                  onClick={() => setChannel("email")}
                  className={`text-[12.5px] font-semibold px-3.5 py-2 rounded-full border transition-colors ${
                    channel === "email" ? "bg-ink text-cream border-ink" : "border-line text-ink-soft"
                  }`}
                >
                  Email
                </button>
              </div>
            )}

            {step === "identifier" ? (
              <>
                <label className="block text-[12.5px] font-semibold text-ink-soft mb-1.5">
                  {channel === "phone" ? "Phone number" : "Email address"}
                </label>
                <div className="flex gap-2.5 mb-3">
                  {channel === "phone" ? (
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      placeholder="10-digit mobile number"
                      className="flex-1 border border-line rounded-lg px-3.5 py-2.5 text-sm bg-card focus:outline-none focus:border-gold"
                    />
                  ) : (
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      placeholder="you@example.com"
                      className="flex-1 border border-line rounded-lg px-3.5 py-2.5 text-sm bg-card focus:outline-none focus:border-gold"
                    />
                  )}
                  <button
                    onClick={handleSendOtp}
                    disabled={sending}
                    className="rounded-full px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60 whitespace-nowrap"
                  >
                    {sending ? "Sending…" : "Send code"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] text-ink-soft mb-4">
                  We sent a code to {identifier}.{" "}
                  <button onClick={() => setStep("identifier")} className="underline text-red-dark">
                    Wrong {channel === "phone" ? "number" : "email"}?
                  </button>
                </p>
                <label className="block text-[12.5px] font-semibold text-ink-soft mb-1.5">
                  Verification code
                </label>
                <div className="flex gap-2.5 mb-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                    placeholder="6-digit code"
                    className="flex-1 border border-line rounded-lg px-3.5 py-2.5 text-sm bg-card focus:outline-none focus:border-gold"
                  />
                  <button
                    onClick={handleVerifyOtp}
                    disabled={verifying}
                    className="rounded-full px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60 whitespace-nowrap"
                  >
                    {verifying ? "Verifying…" : "Verify"}
                  </button>
                </div>
                <button onClick={handleSendOtp} className="text-[12.5px] text-ink-soft underline">
                  Resend code
                </button>
              </>
            )}

            <p className="text-[12.5px] text-ink-soft mt-8">
              Have an order from before sign-in was required?{" "}
              <Link href="/orders" className="underline text-red-dark">
                Look it up here
              </Link>
              .
            </p>
          </>
        ) : view === "profile" ? (
          <div key="profile" className="view-fade">
            <h2 className="font-serif text-red-dark text-2xl mb-6">My account</h2>

            <div className="bg-card border border-line rounded-2xl px-6 py-6 mb-5">
              <ProfileEditor />
              {memberSince && (
                <div className="text-[12px] text-ink-soft mt-3 pt-3 border-t border-line">
                  Member since {memberSince}
                </div>
              )}
            </div>

            <button
              onClick={() => setView("addresses")}
              className="w-full bg-card border border-line rounded-2xl px-6 py-5 mb-3.5 flex items-center justify-between hover:border-gold transition-colors text-left"
            >
              <div>
                <div className="font-serif font-semibold text-[15px] text-ink mb-1">Addresses</div>
                <div className="text-[12.5px] text-ink-soft">Saved delivery addresses</div>
              </div>
              <span className="text-ink-soft text-lg">→</span>
            </button>

            <button
              onClick={() => setView("points")}
              className="w-full bg-card border border-line rounded-2xl px-6 py-5 mb-3.5 flex items-center justify-between hover:border-gold transition-colors text-left"
            >
              <div>
                <div className="font-serif font-semibold text-[15px] text-ink mb-1">Loyalty points</div>
                <div className="text-[12.5px] text-ink-soft">Earn on every order, redeem anytime</div>
              </div>
              <span className="text-ink-soft text-lg">→</span>
            </button>

            <Link
              href="/membership"
              className={`w-full rounded-2xl px-6 py-5 mb-5 flex items-center justify-between transition-colors ${
                isMember
                  ? "bg-[#FBF3E0] border border-gold"
                  : "bg-card border border-line hover:border-gold"
              }`}
            >
              <div>
                <div className="font-serif font-semibold text-[15px] text-ink mb-1 flex items-center gap-2">
                  Divya Bharat Club
                  {isMember && (
                    <span className="text-[9.5px] font-bold text-gold bg-cream px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[12.5px] text-ink-soft">
                  {membershipLoading
                    ? "Loading…"
                    : isMember && membership
                    ? `Valid until ${new Date(membership.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : "Free delivery + 10% off everything"}
                </div>
              </div>
              <span className="text-ink-soft text-lg">→</span>
            </Link>

            <button
              onClick={() => setView("orders")}
              className="w-full bg-card border border-line rounded-2xl px-6 py-5 mb-3.5 flex items-center justify-between hover:border-gold transition-colors text-left"
            >
              <div>
                <div className="font-serif font-semibold text-[15px] text-ink mb-1">My Orders</div>
                <div className="text-[12.5px] text-ink-soft">
                  {ordersLoading
                    ? "Loading…"
                    : `${orders?.length ?? 0} order${(orders?.length ?? 0) === 1 ? "" : "s"}${
                        activeCount > 0 ? ` · ${activeCount} in progress` : ""
                      }`}
                </div>
              </div>
              <span className="text-ink-soft text-lg">→</span>
            </button>

            <button
              onClick={() => setView("wishlist")}
              className="w-full bg-card border border-line rounded-2xl px-6 py-5 mb-3.5 flex items-center justify-between hover:border-gold transition-colors text-left"
            >
              <div>
                <div className="font-serif font-semibold text-[15px] text-ink mb-1">Wishlist</div>
                <div className="text-[12.5px] text-ink-soft">Items you've saved for later</div>
              </div>
              <span className="text-ink-soft text-lg">→</span>
            </button>

            <button
              onClick={() => setView("referrals")}
              className="w-full bg-card border border-line rounded-2xl px-6 py-5 mb-5 flex items-center justify-between hover:border-gold transition-colors text-left"
            >
              <div>
                <div className="font-serif font-semibold text-[15px] text-ink mb-1">Refer a friend</div>
                <div className="text-[12.5px] text-ink-soft">Share your link, earn 15% off</div>
              </div>
              <span className="text-ink-soft text-lg">→</span>
            </button>

            {!ordersLoading && (orders?.length ?? 0) > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-cream border border-line rounded-xl px-4 py-3.5 text-center">
                  <div className="font-semibold text-lg tabular-nums text-red-dark">{orders?.length}</div>
                  <div className="text-[10.5px] text-ink-soft uppercase tracking-wide mt-0.5">
                    Total orders
                  </div>
                </div>
                <div className="bg-cream border border-line rounded-xl px-4 py-3.5 text-center">
                  <div className="font-semibold text-lg tabular-nums text-red-dark">₹{totalSpent}</div>
                  <div className="text-[10.5px] text-ink-soft uppercase tracking-wide mt-0.5">
                    Total spent
                  </div>
                </div>
              </div>
            )}

            <button onClick={signOut} className="text-[12.5px] text-ink-soft underline">
              Sign out
            </button>
          </div>
        ) : view === "orders" ? (
          <div key="orders" className="view-fade">
            <button
              onClick={() => setView("profile")}
              className="text-[12.5px] text-ink-soft hover:text-red-dark mb-5 inline-flex items-center gap-1.5"
            >
              ← Back to profile
            </button>
            <h2 className="font-serif text-red-dark text-2xl mb-6">My Orders</h2>

            {ordersLoading ? (
              <div className="text-sm text-ink-soft text-center py-8">Loading your orders…</div>
            ) : (
              <OrderTabs orders={orders ?? []} />
            )}
          </div>
        ) : view === "wishlist" ? (
          <div key="wishlist" className="view-fade">
            <button
              onClick={() => setView("profile")}
              className="text-[12.5px] text-ink-soft hover:text-red-dark mb-5 inline-flex items-center gap-1.5"
            >
              ← Back to profile
            </button>
            <h2 className="font-serif text-red-dark text-2xl mb-6">Wishlist</h2>
            <WishlistSection />
          </div>
        ) : view === "addresses" ? (
          <div key="addresses" className="view-fade">
            <button
              onClick={() => setView("profile")}
              className="text-[12.5px] text-ink-soft hover:text-red-dark mb-5 inline-flex items-center gap-1.5"
            >
              ← Back to profile
            </button>
            <h2 className="font-serif text-red-dark text-2xl mb-6">Addresses</h2>
            <AddressSection />
          </div>
        ) : view === "points" ? (
          <div key="points" className="view-fade">
            <button
              onClick={() => setView("profile")}
              className="text-[12.5px] text-ink-soft hover:text-red-dark mb-5 inline-flex items-center gap-1.5"
            >
              ← Back to profile
            </button>
            <h2 className="font-serif text-red-dark text-2xl mb-6">Loyalty points</h2>
            <LoyaltySection />
          </div>
        ) : (
          <div key="referrals" className="view-fade">
            <button
              onClick={() => setView("profile")}
              className="text-[12.5px] text-ink-soft hover:text-red-dark mb-5 inline-flex items-center gap-1.5"
            >
              ← Back to profile
            </button>
            <h2 className="font-serif text-red-dark text-2xl mb-6">Refer a friend</h2>
            <ReferralSection />
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
