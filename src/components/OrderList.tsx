"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "./ui";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export const STAGES = ["Placed", "Packed", "Shipped", "Delivered"];
export const ACTIVE_STATUSES = ["Placed", "Packed", "Shipped"];

export type OrderItemLine = {
  product_id?: string;
  variant_id?: string | null;
  product_name: string;
  product_name_odia?: string;
  pack_size?: string | null;
  qty: number;
  price?: number;
};
export type OrderRecord = {
  id: string;
  status: string;
  payment_method?: string;
  payment_status?: string;
  total: number;
  created_at: string;
  phone?: string;
  courier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  order_items: OrderItemLine[];
  order_status_history?: { status: string; changed_at: string }[];
};

const statusClass: Record<string, string> = {
  Placed: "bg-[#FDEBC8] text-[#8A5A0B]",
  Packed: "bg-[#DDE7F5] text-[#2A5090]",
  Shipped: "bg-[#E3DDF5] text-[#5B3E9A]",
  Delivered: "bg-[#DFEFD3] text-[#3A6620]",
  Cancelled: "bg-[#F4DADA] text-[#8A2A2A]"
};

export function OrderCard({ order }: { order: OrderRecord }) {
  const stageIdx = STAGES.indexOf(order.status);
  const { addItem } = useCart();
  const { showToast } = useToast();
  const router = useRouter();

  // A timestamp per stage, if that stage has actually happened —
  // order_status_history records one row per status change, so this is
  // "when did Placed/Packed/Shipped/Delivered actually occur", not just
  // a guess from the current status alone.
  const stageTime = (stage: string) =>
    order.order_status_history?.find((h) => h.status === stage)?.changed_at;

  const { accessToken } = useAuth();
  const [cancelling, setCancelling] = useState(false);

  async function cancelOrder() {
    if (!confirm("Cancel this order? Online payments are refunded to your original payment method.")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ orderId: order.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not cancel.");
      showToast(data.refund === "refunded" ? "Order cancelled and refund started." : data.refund === "pending" ? "Order cancelled. Your refund is being processed by our team." : "Order cancelled.");
      window.location.reload();
    } catch (e: any) {
      showToast(e.message || "Could not cancel.", "err");
      setCancelling(false);
    }
  }

  function reorder() {
    const reorderable = order.order_items.filter((it) => it.product_id && it.price !== undefined);
    if (reorderable.length === 0) {
      showToast("This order is too old to reorder automatically.", "err");
      return;
    }
    reorderable.forEach((it) => {
      addItem(
        {
          productId: it.product_id!,
          variantId: it.variant_id || it.product_id!,
          packSize: it.pack_size || "",
          name: it.product_name,
          nameOdia: it.product_name_odia || "",
          price: it.price!
        },
        it.qty
      );
    });
    showToast("Items added to your cart.");
    router.push("/checkout");
  }

  return (
    <div className="border border-line rounded-xl px-5 py-5 mb-4 bg-card animate-fadeSlideUp hover:shadow-sm hover:border-gold-soft transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="font-semibold text-sm font-mono tracking-wide">{order.id}</div>
          <div className="text-[11.5px] text-ink-soft mt-1">
            {new Date(order.created_at).toLocaleString()}
            {order.payment_method && ` · ${order.payment_method}`}
            {order.payment_status === "paid" && <span className="text-sage font-semibold"> · Paid</span>}
          </div>
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide flex-shrink-0 ${
            statusClass[order.status] ?? "bg-cream-2 text-ink-soft"
          }`}
        >
          {order.status}
        </span>
      </div>

      {(order.tracking_number || order.tracking_url) && order.status !== "Cancelled" && (
        <div className="mb-3 border border-line bg-cream px-3 py-2 text-[12.5px] text-ink-soft">
          {order.courier && <>Courier: <b className="text-ink">{order.courier}</b> · </>}
          {order.tracking_number && <>Tracking no. <b className="text-ink">{order.tracking_number}</b> </>}
          {order.tracking_url && (
            <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="ml-1 text-red-dark underline">
              Track parcel
            </a>
          )}
        </div>
      )}

      {order.status !== "Cancelled" && (
        <div className="relative flex justify-between my-5">
          <div className="absolute top-[9px] left-3.5 right-3.5 h-0.5 bg-line z-0" />
          {STAGES.map((s, i) => {
            const time = stageTime(s);
            return (
              <div
                key={s}
                className={`flex-1 text-center relative z-10 text-[10px] ${
                  i <= stageIdx ? "text-sage font-semibold" : "text-ink-soft"
                }`}
              >
                <div
                  className={`w-[18px] h-[18px] rounded-full mx-auto mb-2 border-2 ${
                    i <= stageIdx ? "bg-sage border-sage" : "bg-card border-line"
                  }`}
                />
                {s}
                {time && (
                  <div className="text-[9px] text-ink-soft/70 font-normal mt-0.5 whitespace-nowrap">
                    {new Date(time).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[12.5px] text-ink-soft leading-relaxed mb-4">
        {order.order_items.map((it) => `${it.product_name}${it.pack_size ? ` (${it.pack_size})` : ""} ×${it.qty}`).join(", ")}
      </div>
      <div className="flex justify-between items-center pt-3.5 border-t border-line">
        <span className="text-[12.5px] text-ink-soft font-medium">Total</span>
        <span className="font-bold text-lg tabular-nums text-ink">₹{order.total}</span>
      </div>
      {order.status === "Placed" && accessToken && (
        <button
          onClick={cancelOrder}
          disabled={cancelling}
          className="mt-3.5 w-full rounded-full border border-red/40 py-2.5 text-[12.5px] font-semibold text-red-dark hover:bg-[#FBEFEA] disabled:opacity-60"
        >
          {cancelling ? "Cancelling…" : "Cancel order"}
        </button>
      )}
      <button
        onClick={reorder}
        className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-line text-[12.5px] font-semibold text-ink-soft hover:border-gold hover:text-ink transition-colors"
      >
        <i className="ti ti-repeat" style={{ fontSize: 14 }} aria-hidden="true" />
        Reorder
      </button>
      {order.status === "Delivered" && (
        <Link
          href={`/returns?order=${encodeURIComponent(order.id)}`}
          className="mt-2 w-full block text-center py-2.5 rounded-full border border-line text-[12.5px] font-semibold text-ink-soft hover:border-gold hover:text-ink transition-colors"
        >
          Request a return or refund
        </Link>
      )}
      {order.phone && (
        <a
          href={`/api/orders/invoice?orderId=${encodeURIComponent(order.id)}&phone=${encodeURIComponent(order.phone)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 w-full block text-center py-2.5 rounded-full border border-line text-[12.5px] font-semibold text-ink-soft hover:border-gold hover:text-ink transition-colors"
        >
          Download invoice
        </a>
      )}
    </div>
  );
}

export function OrderTabs({ orders }: { orders: OrderRecord[] }) {
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));
  const [tab, setTab] = useState<"current" | "past">(activeOrders.length > 0 ? "current" : "past");

  if (orders.length === 0) {
    return <EmptyState compact title="No orders yet." text="When you place your first order, you can track it here." ctaLabel="Start shopping" ctaHref="/collections" />;
  }

  const shown = tab === "current" ? activeOrders : pastOrders;

  return (
    <div>
      <div className="flex gap-2 mb-5 border-b border-line">
        {[
          { key: "current" as const, label: "Current", count: activeOrders.length },
          { key: "past" as const, label: "Previous", count: pastOrders.length }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-1 pb-3 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-red text-red-dark"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
            <span
              className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-red text-cream" : "bg-cream-2 text-ink-soft"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState compact title={tab === "current" ? "Nothing on the way." : "No past orders."} text={tab === "current" ? "Orders in progress will show up here." : undefined} />
      ) : (
        shown.map((o) => <OrderCard key={o.id} order={o} />)
      )}
    </div>
  );
}

export function OrderList({ orders }: { orders: OrderRecord[] }) {
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  if (orders.length === 0) {
    return (
      <EmptyState compact title="No orders found." text="Check the phone number and try again." />
    );
  }

  return (
    <>
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[11px] uppercase tracking-[.12em] text-ink-soft font-semibold mb-3">
            Current order{activeOrders.length === 1 ? "" : "s"}
          </h3>
          {activeOrders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
      {pastOrders.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-[.12em] text-ink-soft font-semibold mb-3">
            Past orders
          </h3>
          {pastOrders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </>
  );
}
