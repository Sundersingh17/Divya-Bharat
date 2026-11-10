"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OrderList, OrderRecord } from "@/components/OrderList";
import { useAuth } from "@/context/AuthContext";

// Track an order. Signed-in customers see their own orders; guests (orders
// placed before sign-in was required) must give BOTH the order ID and the
// phone number on it, and see only that one order with a masked address.
export default function TrackOrderPage() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(url: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not look up that order.");
        setOrders(null);
        return;
      }
      setOrders(data.orders ?? []);
    } catch {
      setError("Could not look up that order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user && accessToken) load("/api/orders");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, accessToken]);

  function guestLookup() {
    if (!orderId.trim() || !/^[0-9]{10}$/.test(phone.trim())) {
      setError("Enter your order ID and the 10-digit phone number used on the order.");
      return;
    }
    load(`/api/orders?orderId=${encodeURIComponent(orderId.trim())}&phone=${encodeURIComponent(phone.trim())}`);
  }

  return (
    <>
      <Header categories={[]} />
      <div className="mx-auto max-w-xl px-5 py-10 pb-16">
        <h1 className="mb-1.5 font-serif text-2xl text-red-dark">Track your order</h1>

        {authLoading ? null : user ? (
          <p className="mb-6 text-[13.5px] text-ink-soft">
            Showing the orders on your account. Full details and invoices are also under{" "}
            <Link href="/account" className="text-red-dark underline">
              My account
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mb-6 text-[13.5px] text-ink-soft">
              <Link href="/account?next=/orders" className="text-red-dark underline">
                Sign in
              </Link>{" "}
              to see all your orders. Or look up a single order with its ID and the phone number used on it.
            </p>
            <div className="mb-3 grid gap-2.5 sm:grid-cols-2">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Order ID (e.g. DB2610…)"
                aria-label="Order ID"
                className="rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && guestLookup()}
                placeholder="10-digit mobile number"
                aria-label="Phone number"
                className="rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
              />
            </div>
            <button
              onClick={guestLookup}
              disabled={loading}
              className="mb-8 rounded-lg bg-red px-5 py-2.5 text-sm font-semibold text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
            >
              {loading ? "Searching…" : "Find order"}
            </button>
          </>
        )}

        {error && (
          <p role="alert" className="mb-6 text-[13px] text-red-dark">
            {error}
          </p>
        )}
        {loading && orders === null && <div className="py-8 text-center text-sm text-ink-soft">Loading…</div>}
        {orders !== null && <OrderList orders={orders} />}
      </div>
      <Footer />
    </>
  );
}
