"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Spinner from "@/components/Spinner";
import { useAuth } from "@/context/AuthContext";

type ConfirmedOrder = {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  discount_amount: number;
  coupon_code: string | null;
  address: string;
  email: string | null;
  order_items: { product_name: string; pack_size: string | null; qty: number; price: number }[];
};

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}

function Content() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const { user, accessToken, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!orderId || !user || !accessToken) {
      setLoading(false);
      return;
    }
    fetch(`/api/orders/confirm?order=${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load the order.");
        setOrder(data.order);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authLoading, orderId, user, accessToken]);

  const paid = order?.payment_status === "paid";

  return (
    <>
      <Header categories={[]} />
      <div className="mx-auto max-w-xl px-5 py-10 pb-16">
        {loading || authLoading ? (
          <Spinner />
        ) : !orderId ? (
          <p className="text-sm text-ink-soft">
            No order selected. <Link href="/orders" className="text-red-dark underline">Track an order</Link>
          </p>
        ) : !user ? (
          <p className="text-sm text-ink-soft">
            <Link href={`/account?next=${encodeURIComponent(`/order-confirmation?order=${orderId}`)}`} className="text-red-dark underline">
              Sign in
            </Link>{" "}
            to view this order.
          </p>
        ) : error || !order ? (
          <p role="alert" className="text-sm text-red-dark">
            {error || "We couldn't find that order on your account."} If you were charged, please contact us from the{" "}
            <Link href="/help#order-support" className="underline">Help</Link> page.
          </p>
        ) : (
          <div className="animate-fadeSlideUp">
            <div className="mx-auto mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-sage text-3xl text-white" aria-hidden="true">
              ✓
            </div>
            <h1 className="mb-2 text-center font-serif text-2xl text-red-dark">Order placed</h1>
            <p className="mb-1 text-center text-sm text-ink-soft">
              Order <b>{order.id}</b> —{" "}
              {paid ? "payment received." : `pay ₹${order.total} on delivery.`}
            </p>
            {order.email && <p className="mb-6 text-center text-[12.5px] text-ink-soft">A confirmation email is on its way to {order.email}.</p>}

            <div className="mt-6 rounded-xl border border-line bg-card p-5">
              <ul className="mb-4 divide-y divide-line text-sm">
                {order.order_items.map((i, idx) => (
                  <li key={idx} className="flex justify-between py-2">
                    <span>
                      {i.product_name}
                      {i.pack_size ? ` · ${i.pack_size}` : ""} × {i.qty}
                    </span>
                    <span className="tabular-nums">₹{i.price * i.qty}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1.5 border-t border-line pt-3 text-sm text-ink-soft">
                <Row label="Subtotal" value={`₹${order.subtotal}`} />
                {order.discount_amount > 0 && <Row label={`Coupon${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={`−₹${order.discount_amount}`} />}
                <Row label="Delivery" value={order.shipping_fee === 0 ? "Free" : `₹${order.shipping_fee}`} />
                <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink">
                  <span>Total</span>
                  <span className="tabular-nums">₹{order.total}</span>
                </div>
              </div>
              <p className="mt-4 text-[12.5px] text-ink-soft">
                <b className="text-ink">Delivering to:</b> {order.address}
              </p>
            </div>

            <p className="mt-5 text-[13px] text-ink-soft">
              What happens next: we pack your order and update its status as it ships. Delivery and returns details are on the{" "}
              <Link href="/help#shipping" className="text-red-dark underline">Help</Link> page.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/account" className="rounded-full bg-red px-5 py-3 text-sm font-semibold text-[#FBF6EE] hover:bg-red-dark">
                Track this order
              </Link>
              <Link href="/collections" className="rounded-full border border-ink px-5 py-3 text-sm font-semibold hover:border-red hover:text-red-dark">
                Continue shopping
              </Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
