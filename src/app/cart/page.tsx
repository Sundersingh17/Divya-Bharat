"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductImage from "@/components/ProductImage";
import { Container, EmptyState } from "@/components/ui";
import { useCart } from "@/context/CartContext";
import { useActiveMembership } from "@/lib/useActiveMembership";
import { MEMBERSHIP_DISCOUNT_PCT } from "@/lib/membership";
import { FREE_SHIP_THRESHOLD, SHIPPING_FEE } from "@/lib/shipping";

// Dedicated cart page. Figures here are an estimate for display; checkout
// and the server recompute prices, stock, coupons and delivery.
export default function CartPage() {
  const { items, count, subtotal, changeQty, removeItem } = useCart();
  const { isMember } = useActiveMembership();

  const remaining = FREE_SHIP_THRESHOLD - subtotal;
  const freeDelivery = isMember || remaining <= 0;
  const shipping = freeDelivery ? 0 : SHIPPING_FEE;
  const clubDiscount = isMember ? Math.round(subtotal * (MEMBERSHIP_DISCOUNT_PCT / 100)) : 0;
  const total = subtotal - clubDiscount + shipping;

  return (
    <>
      <Header categories={[]} />
      <div className="section-pad">
        <Container>
          <h1 className="heading-section mb-8 text-[32px] md:text-[40px]">Your cart</h1>
          {items.length === 0 ? (
            <EmptyState title="Your pantry is quiet." text="Looks like you haven't added anything yet." ctaLabel="Explore products" ctaHref="/collections" />
          ) : (
            <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
              <ul className="divide-y divide-line border-y border-line">
                {items.map((item) => (
                  <li key={item.variantId} className="flex gap-4 py-5">
                    <Link href={`/product/${item.productId}`} className="h-[96px] w-[80px] flex-shrink-0 overflow-hidden bg-cream-2">
                      <ProductImage productId={item.productId} categoryId={item.categoryId ?? "other"} alt={item.name} className="h-full w-full" iconSize="text-xl" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link href={`/product/${item.productId}`} className="text-[15px] font-semibold text-ink hover:text-red-dark">
                            {item.name}
                          </Link>
                          <div className="mt-0.5 text-[12px] text-ink-soft">
                            {item.packSize}
                            {item.nameOdia && ` · ${item.nameOdia}`}
                          </div>
                          <div className="mt-1 text-[12px] text-ink-soft tabular-nums">₹{item.price} each</div>
                        </div>
                        <div className="text-[15px] font-semibold tabular-nums">₹{item.price * item.qty}</div>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="inline-flex items-center border border-ink/70">
                          <button onClick={() => changeQty(item.variantId, -1)} className="flex h-9 w-9 items-center justify-center hover:bg-ink hover:text-warm" aria-label={`Decrease ${item.name} quantity`}>
                            <i className="ti ti-minus text-[13px]" aria-hidden="true" />
                          </button>
                          <span className="min-w-[32px] text-center text-[13px] font-semibold tabular-nums" aria-live="polite">{item.qty}</span>
                          <button onClick={() => changeQty(item.variantId, 1)} className="flex h-9 w-9 items-center justify-center hover:bg-ink hover:text-warm" aria-label={`Increase ${item.name} quantity`}>
                            <i className="ti ti-plus text-[13px]" aria-hidden="true" />
                          </button>
                        </div>
                        <button onClick={() => removeItem(item.variantId)} className="text-[12px] text-ink-soft underline underline-offset-4 hover:text-red">
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <aside className="h-fit border border-line bg-warm p-6 lg:sticky lg:top-28">
                <h2 className="mb-4 font-serif text-[20px] font-semibold">Order summary</h2>
                <div className="space-y-2 text-[14px] text-ink-soft">
                  <Line label={`Subtotal (${count} item${count === 1 ? "" : "s"})`} value={`₹${subtotal}`} />
                  {clubDiscount > 0 && <Line label={`Club discount (${MEMBERSHIP_DISCOUNT_PCT}%)`} value={`−₹${clubDiscount}`} accent />}
                  <Line label="Delivery" value={shipping === 0 ? "Free" : `₹${shipping}`} />
                </div>
                {!freeDelivery && (
                  <p className="mt-3 text-[12.5px] text-ink">
                    Add <b className="tabular-nums">₹{remaining}</b> more for free delivery.
                  </p>
                )}
                {!isMember && (
                  <Link href="/membership" className="mt-3 block text-[12.5px] text-gold underline underline-offset-4">
                    Divya Bharat Club: {MEMBERSHIP_DISCOUNT_PCT}% off and free delivery
                  </Link>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <span className="font-semibold">Estimated total</span>
                  <span className="font-serif text-[24px] font-semibold tabular-nums">₹{total}</span>
                </div>
                <p className="mt-2 text-[11.5px] text-ink-soft">Coupons and loyalty points are applied at checkout, where prices and stock are confirmed.</p>
                <Link href="/checkout" className="btn-primary mt-5 w-full">
                  Proceed to checkout
                  <i className="ti ti-arrow-right text-[17px]" aria-hidden="true" />
                </Link>
                <Link href="/collections" className="mt-3 block text-center text-[12.5px] text-ink-soft underline underline-offset-4">
                  Continue shopping
                </Link>
              </aside>
            </div>
          )}
        </Container>
      </div>
      <Footer />
    </>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-leaf" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
