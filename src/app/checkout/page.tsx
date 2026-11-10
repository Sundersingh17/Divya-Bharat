"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useActiveMembership } from "@/lib/useActiveMembership";
import { MEMBERSHIP_DISCOUNT_PCT } from "@/lib/membership";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import { useLanguage } from "@/context/LanguageContext";
import Spinner from "@/components/Spinner";
import { FREE_SHIP_THRESHOLD, SHIPPING_FEE } from "@/lib/shipping";
import { maxRedeemablePoints, RUPEES_PER_POINT_REDEEMED } from "@/lib/loyalty";


declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { showToast } = useToast();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { isMember } = useActiveMembership();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; label: string; full_address: string; is_default: boolean }[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [placing, setPlacing] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [placedTotal, setPlacedTotal] = useState(0);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; freeShipping: boolean } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [pointsBalance, setPointsBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);

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

  const couponDiscount = appliedCoupon?.discount ?? 0;
  const shipping = isMember || appliedCoupon?.freeShipping || subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const clubDiscount = isMember ? Math.round(subtotal * (MEMBERSHIP_DISCOUNT_PCT / 100)) : 0;
  const redeemablePoints = maxRedeemablePoints(subtotal, pointsBalance);
  const pointsDiscount = usePoints ? redeemablePoints * RUPEES_PER_POINT_REDEEMED : 0;
  const total = Math.max(0, subtotal - clubDiscount - couponDiscount - pointsDiscount + shipping);

  useEffect(() => {
    if (!user) {
      setPointsBalance(0);
      return;
    }
    supabase
      .from("loyalty_transactions")
      .select("points")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setPointsBalance((data ?? []).reduce((sum, row) => sum + row.points, 0));
      });
  }, [user]);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponChecking(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotal })
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "Invalid code.");
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon({ code: data.code, discount: data.discount, freeShipping: data.freeShipping });
      showToast(`Code ${data.code} applied!`);
    } catch {
      setCouponError("Could not check that code. Please try again.");
    } finally {
      setCouponChecking(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  }

  function saveCartSnapshot() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || items.length === 0) return;
    // Best-effort background save — never blocks or interrupts checkout.
    fetch("/api/cart-snapshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({ email: email.trim(), items, subtotal })
    }).catch(() => {});
  }

  async function trackReferralIfAny(orderId: string) {
    if (!accessToken) return;
    let code: string | null = null;
    try {
      code = localStorage.getItem("db_referral_code");
    } catch {
      return;
    }
    if (!code) return;
    try {
      await fetch("/api/referral/track", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ referralCode: code, orderId })
      });
    } catch {
      // Referral tracking is a background nicety — never surface this as
      // an error on an otherwise-successful order.
    } finally {
      try {
        localStorage.removeItem("db_referral_code");
      } catch {}
    }
  }

  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone.replace(/^91/, ""));
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .then(({ data }) => {
        setSavedAddresses(data ?? []);
        const def = data?.find((a: any) => a.is_default) ?? data?.[0];
        if (def) {
          setSelectedAddressId(def.id);
          setAddress(def.full_address);
        } else {
          setShowAddressForm(true);
        }
      });
  }, [user]);

  useEffect(() => {
    if (items.length > 0) {
      trackBeginCheckout(
        items.map((i) => ({ item_id: i.productId, item_name: i.name, price: i.price, quantity: i.qty })),
        total
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateDetails() {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      showToast("Please fill in your name, phone and address.", "err");
      return false;
    }
    if (!/^[0-9]{10}$/.test(phone.trim())) {
      showToast("Please enter a valid 10-digit phone number.", "err");
      return false;
    }
    if (items.length === 0) {
      showToast("Your cart is empty.", "err");
      return false;
    }
    return true;
  }

  function rememberForOrdersPage(orderId: string) {
    try {
      localStorage.setItem("db_last_phone", phone.trim());
      const raw = localStorage.getItem("db_my_order_ids");
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(orderId)) ids.unshift(orderId);
      localStorage.setItem("db_my_order_ids", JSON.stringify(ids.slice(0, 20)));
    } catch {
      // localStorage unavailable — order still succeeded, just won't auto-load next time
    }
  }

  // Only WHAT is being bought is sent; the server recomputes every price,
  // discount, delivery fee and the total. `total` is just what the customer saw.
  function orderPayload() {
    return {
      customerName: name,
      phone,
      email,
      address,
      items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty })),
      couponCode: appliedCoupon?.code,
      redeemedPoints: usePoints ? redeemablePoints : 0,
      total
    };
  }

  function finishOrder(orderId: string) {
    setPlacedOrderId(orderId);
    setPlacedTotal(total);
    rememberForOrdersPage(orderId);
    trackPurchase({
      orderId,
      value: total,
      items: items.map((i) => ({ item_id: i.productId, item_name: i.name, price: i.price, quantity: i.qty }))
    });
    trackReferralIfAny(orderId);
    clearCart();
    router.replace(`/order-confirmation?order=${encodeURIComponent(orderId)}`);
  }

  async function placeCodOrder() {
    if (!validateDetails()) return;
    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(orderPayload())
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");
      finishOrder(data.orderId);
    } catch (e: any) {
      showToast(e?.message || "Something went wrong placing your order. Please try again.", "err");
    } finally {
      setPlacing(false);
    }
  }

  async function payOnline() {
    if (!validateDetails()) return;
    const ready = razorpayReady || (await waitForRazorpay());
    if (!ready) {
      showToast(
        "Could not load the payment window. Please disable any ad blocker for this site and refresh the page.",
        "err"
      );
      return;
    }
    setPlacing(true);
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(orderPayload())
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Could not start payment");

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "Divya Bharat Food Processing Centre",
        description: "Order payment",
        prefill: { name, contact: phone, email: email || undefined },
        theme: { color: "#B85C38" },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                ...orderPayload()
              })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");
            finishOrder(verifyData.orderId);
          } catch (e: any) {
            showToast(
              (e?.message || "Payment succeeded but order confirmation failed.") +
                " If you were charged, contact us with payment ID " + response.razorpay_payment_id + ".",
              "err"
            );
          } finally {
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => setPlacing(false)
        }
      });
      rzp.open();
    } catch (e: any) {
      showToast(e?.message || "Could not start payment. Please try again.", "err");
      setPlacing(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayReady(true)} />
      <Header categories={[]} />

      <div className="max-w-xl mx-auto px-5 py-10 pb-16">
        {placedOrderId ? (
          <div className="text-center py-10 animate-fadeSlideUp">
            <div className="w-[60px] h-[60px] rounded-full bg-sage text-white flex items-center justify-center text-3xl mx-auto mb-4.5 animate-popIn">
              ✓
            </div>
            <h2 className="font-serif text-red-dark text-2xl mb-2">{t("orderPlaced")}</h2>
            <p className="text-sm text-ink-soft mb-1.5">
              Order <b>{placedOrderId}</b> has been confirmed
              {paymentMethod === "online" ? " — payment received." : ", pay ₹" + placedTotal + " on delivery."}
            </p>
            {email && (
              <p className="text-[12.5px] text-ink-soft mb-6">A confirmation has been sent to {email}.</p>
            )}
            {!email && <div className="mb-6" />}
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => router.push(user ? "/account" : "/orders")}
                className="rounded-full px-5 py-3 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark"
              >
                {t("trackThisOrder")}
              </button>
              <button
                onClick={() => router.push("/")}
                className="rounded-full px-5 py-3 text-sm font-semibold border border-ink hover:border-red hover:text-red-dark"
              >
                {t("continueShopping")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-red-dark text-2xl mb-1.5">{t("checkout")}</h2>
            <p className="text-[13.5px] text-ink-soft mb-2">
              Pay securely online, or choose cash on delivery.
            </p>
            {user && (
              <p className="text-[12.5px] text-sage font-medium mb-4.5">
                Signed in as {user.phone || user.email} — this order will be saved to your account.
              </p>
            )}
            {!user && <div className="mb-6.5" />}

            {authLoading ? (
              <Spinner />
            ) : !user ? (
              <div className="bg-card border border-line rounded-xl px-5 py-8 text-center">
                <div className="text-[15px] font-serif font-semibold text-ink mb-2">
                  Sign in to check out
                </div>
                <p className="text-[13px] text-ink-soft mb-5 max-w-xs mx-auto">
                  We require a verified sign-in before placing an order — this keeps orders
                  accountable and protects you from fraudulent orders placed in your name.
                  Your cart will be waiting for you.
                </p>
                <button
                  onClick={() => router.push("/account?next=/checkout")}
                  className="rounded-full px-6 py-3 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark transition-colors"
                >
                  Sign in to continue
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="text-sm text-ink-soft">
                Your cart is empty.{" "}
                <a href="/" className="underline text-red-dark">
                  Go back to shop
                </a>
                .
              </div>
            ) : (
              <>
                {isMember && (
                  <div className="bg-[#FBF3E0] border border-gold-soft rounded-xl px-4 py-3 mb-4 text-[12.5px] text-ink flex items-center gap-2">
                    <span className="text-gold font-semibold">Club</span> — free delivery + {MEMBERSHIP_DISCOUNT_PCT}% off applied
                  </div>
                )}
                {!isMember && user && (
                  <Link
                    href="/membership"
                    className="block bg-cream border border-line rounded-xl px-4 py-3 mb-4 text-[12.5px] text-ink-soft hover:border-gold transition-colors"
                  >
                    Save ₹{Math.round(subtotal * (MEMBERSHIP_DISCOUNT_PCT / 100)) + (shipping || SHIPPING_FEE)} on this order with{" "}
                    <b className="text-gold">Divya Bharat Club</b> →
                  </Link>
                )}
                <div className="bg-card border border-line rounded-xl px-5 py-5 mb-4">
                  <div className="flex justify-between items-center text-sm text-ink-soft mb-2.5">
                    <span>
                      {items.reduce((s, i) => s + i.qty, 0)} item
                      {items.reduce((s, i) => s + i.qty, 0) === 1 ? "" : "s"} in cart
                    </span>
                    <span className="tabular-nums">₹{subtotal}</span>
                  </div>
                  {clubDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm text-sage mb-2.5">
                      <span>Club discount (-{MEMBERSHIP_DISCOUNT_PCT}%)</span>
                      <span className="tabular-nums">-₹{clubDiscount}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm text-sage mb-2.5">
                      <span>Coupon ({appliedCoupon?.code})</span>
                      <span className="tabular-nums">-₹{couponDiscount}</span>
                    </div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm text-sage mb-2.5">
                      <span>Points redeemed ({redeemablePoints})</span>
                      <span className="tabular-nums">-₹{pointsDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm text-ink-soft mb-3.5">
                    <span>Delivery</span>
                    <span className="tabular-nums">{shipping === 0 ? "Free" : `₹${shipping}`}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3.5 border-t border-line">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold text-lg tabular-nums text-ink">₹{total}</span>
                  </div>
                </div>

                {redeemablePoints > 0 && (
                  <button
                    type="button"
                    onClick={() => setUsePoints(!usePoints)}
                    className={`w-full flex items-center justify-between border rounded-xl px-4 py-3.5 mb-4 text-[13px] transition-colors ${
                      usePoints ? "border-sage bg-[#EBF0E4]" : "border-line bg-card"
                    }`}
                  >
                    <span>
                      <span className="font-semibold">
                        {usePoints ? "✓ " : ""}Use {redeemablePoints} points
                      </span>
                      <span className="text-ink-soft"> — save ₹{redeemablePoints * RUPEES_PER_POINT_REDEEMED}</span>
                    </span>
                    <span className="text-ink-soft">{pointsBalance} available</span>
                  </button>
                )}

                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-[#EBF0E4] border border-sage/30 rounded-xl px-4 py-3 mb-6 text-[13px] view-fade">
                    <span className="text-sage font-medium">✓ {appliedCoupon.code} applied</span>
                    <button onClick={removeCoupon} className="text-ink-soft underline text-[12px]">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="mb-6">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                        placeholder="Coupon code"
                        className="flex-1 border border-line rounded-lg px-3.5 py-2.5 text-sm bg-card focus:outline-none focus:border-gold uppercase"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={couponChecking}
                        className="rounded-lg px-4 py-2.5 text-[13px] font-semibold border border-line text-ink hover:border-gold disabled:opacity-60"
                      >
                        {couponChecking ? "Checking…" : "Apply"}
                      </button>
                    </div>
                    {couponError && <p className="text-[12px] text-red-dark mt-1.5">{couponError}</p>}
                  </div>
                )}


                <label className="block text-[12.5px] font-semibold text-ink-soft mb-1.5">
                  {t("fullName")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-card mb-3.5 focus:outline-none focus:border-gold"
                />

                <label className="block text-[12.5px] font-semibold text-ink-soft mb-1.5">
                  {t("phoneNumber")}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-card mb-3.5 focus:outline-none focus:border-gold"
                />

                <label className="block text-[12.5px] font-semibold text-ink-soft mb-1.5">
                  Email <span className="font-normal text-ink-soft/70">(optional, for order updates)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={saveCartSnapshot}
                  placeholder="you@example.com"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-card mb-3.5 focus:outline-none focus:border-gold"
                />

                <label className="block text-[12.5px] font-semibold text-ink-soft mb-1.5">
                  {t("deliveryAddress")}
                </label>
                {savedAddresses.length > 0 && !showAddressForm ? (
                  <div className="mb-3.5 space-y-2">
                    {savedAddresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAddressId(a.id);
                          setAddress(a.full_address);
                        }}
                        className={`w-full text-left border rounded-lg px-3.5 py-2.5 text-[13px] transition-colors ${
                          selectedAddressId === a.id ? "border-red bg-[#FBEFEA]" : "border-line bg-card"
                        }`}
                      >
                        <span className="font-semibold">{a.label}</span>
                        <span className="text-ink-soft"> — {a.full_address}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressForm(true);
                        setSelectedAddressId(null);
                        setAddress("");
                      }}
                      className="text-[12px] font-semibold text-red-dark underline"
                    >
                      + Use a different address
                    </button>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      placeholder="House number, street, city, state, PIN code"
                      className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-card mb-2 focus:outline-none focus:border-gold"
                    />
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="text-[12px] font-semibold text-ink-soft underline mb-3.5 block"
                      >
                        Use a saved address instead
                      </button>
                    )}
                  </>
                )}

                <label className="block text-[12.5px] font-semibold text-ink-soft mb-2 mt-1.5">
                  {t("paymentMethod")}
                </label>
                <div role="group" aria-label="Payment method" className="grid grid-cols-2 gap-2.5 mb-6">
                  <button
                    type="button"
                    aria-pressed={paymentMethod === "online"}
                    onClick={() => setPaymentMethod("online")}
                    className={`text-left border rounded-lg px-4 py-3 text-[13.5px] transition-colors ${
                      paymentMethod === "online" ? "border-red bg-[#FBEFEA]" : "border-line bg-card"
                    }`}
                  >
                    <div className="font-semibold">{t("payOnline")}</div>
                    <div className="text-[11.5px] text-ink-soft mt-0.5">UPI, card, netbanking</div>
                  </button>
                  <button
                    type="button"
                    aria-pressed={paymentMethod === "cod"}
                    onClick={() => setPaymentMethod("cod")}
                    className={`text-left border rounded-lg px-4 py-3 text-[13.5px] transition-colors ${
                      paymentMethod === "cod" ? "border-red bg-[#FBEFEA]" : "border-line bg-card"
                    }`}
                  >
                    <div className="font-semibold">{t("cashOnDelivery")}</div>
                    <div className="text-[11.5px] text-ink-soft mt-0.5">Pay when it arrives</div>
                  </button>
                </div>

                <button
                  onClick={paymentMethod === "online" ? payOnline : placeCodOrder}
                  disabled={placing}
                  className="w-full py-3.5 rounded-full font-semibold text-sm bg-red text-[#FBF6EE] hover:bg-red-dark disabled:bg-[#C9B99E] disabled:cursor-not-allowed transition-colors"
                >
                  {placing
                    ? "Processing…"
                    : paymentMethod === "online"
                    ? `Pay ₹${total} securely`
                    : `${t("placeOrder")} · ₹${total}`}
                </button>
                {paymentMethod === "online" && (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_") && (
                  <p className="text-[11px] text-ink-soft text-center mt-3">
                    Test mode — use Razorpay test card 4111 1111 1111 1111, any future
                    expiry, any CVV. No real money is charged.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </>
  );
}
