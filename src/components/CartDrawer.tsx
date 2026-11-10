"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useActiveMembership } from "@/lib/useActiveMembership";
import { MEMBERSHIP_DISCOUNT_PCT } from "@/lib/membership";
import { useLanguage } from "@/context/LanguageContext";
import ProductImage from "./ProductImage";
import { EmptyState } from "./ui";
import { FREE_SHIP_THRESHOLD, SHIPPING_FEE } from "@/lib/shipping";


export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, count, subtotal, changeQty, removeItem } = useCart();
  const { t } = useLanguage();
  const { isMember } = useActiveMembership();

  // Escape closes the drawer; page behind does not scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Business logic unchanged from the previous drawer.
  const remaining = FREE_SHIP_THRESHOLD - subtotal;
  const shipping = isMember || remaining <= 0 ? 0 : SHIPPING_FEE;
  const clubDiscount = isMember ? Math.round(subtotal * (MEMBERSHIP_DISCOUNT_PCT / 100)) : 0;

  const unlocked = isMember || remaining <= 0;
  const progress = unlocked ? 100 : Math.max(4, Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100));

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-[105] bg-ink/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        aria-hidden={!open}
        inert={!open ? ("" as unknown as boolean) : undefined}
        className={`fixed right-0 top-0 z-[110] flex h-full w-full max-w-[430px] flex-col bg-cream shadow-lg transition-transform duration-[380ms] ease-[cubic-bezier(.22,.9,.35,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line bg-warm px-6 py-5">
          <div>
            <h3 className="font-serif text-[22px] font-semibold leading-none text-ink">{t("yourCart")}</h3>
            <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-eyebrow text-ink-soft">
              {count} item{count === 1 ? "" : "s"}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="flex h-10 w-10 items-center justify-center text-ink hover:text-red"
          >
            <i className="ti ti-x text-[22px]" aria-hidden="true" />
          </button>
        </div>

        {items.length > 0 && (
          <div className="border-b border-line bg-warm px-6 pb-4 pt-3.5">
            <div className="mb-2.5 text-[12.5px] text-ink">
              {isMember ? (
                <span className="font-semibold text-leaf">🎉 Club member — free delivery on this order</span>
              ) : unlocked ? (
                <span className="font-semibold text-leaf">🎉 Free delivery unlocked</span>
              ) : (
                <>
                  <b className="tabular-nums">₹{remaining}</b> away from free delivery
                </>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden bg-cream-2" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`h-full transition-all duration-700 ease-out ${unlocked ? "bg-leaf" : "bg-turmeric"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center pb-16">
              <EmptyState
                title="Your pantry is quiet."
                text="Looks like you haven't added anything yet."
                ctaLabel="Explore products"
                ctaHref="/collections"
                onCta={onClose}
                compact
              />
            </div>
          ) : (
            items.map((item) => (
              <div key={item.variantId} className="flex gap-4 border-b border-line py-5">
                <div className="h-[84px] w-[72px] flex-shrink-0 overflow-hidden bg-cream-2">
                  <ProductImage
                    productId={item.productId}
                    categoryId={item.categoryId ?? "other"}
                    alt={item.name}
                    className="h-full w-full"
                    iconSize="text-xl"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold leading-snug text-ink">{item.name}</div>
                      <div className="mt-0.5 text-[11.5px] text-ink-soft">
                        {item.packSize}
                        {item.nameOdia && ` · ${item.nameOdia}`}
                      </div>
                    </div>
                    <div className="text-[14px] font-semibold tabular-nums text-ink">₹{item.price * item.qty}</div>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="inline-flex items-center border border-ink/70">
                      <button
                        onClick={() => changeQty(item.variantId, -1)}
                        className="flex h-8 w-8 items-center justify-center hover:bg-ink hover:text-warm"
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <i className="ti ti-minus text-[13px]" aria-hidden="true" />
                      </button>
                      <span className="min-w-[28px] text-center text-[13px] font-semibold tabular-nums">{item.qty}</span>
                      <button
                        onClick={() => changeQty(item.variantId, 1)}
                        className="flex h-8 w-8 items-center justify-center hover:bg-ink hover:text-warm"
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <i className="ti ti-plus text-[13px]" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="text-[11.5px] text-ink-soft underline decoration-line underline-offset-4 hover:text-red"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="pb-safe border-t border-line bg-warm px-6 pb-6 pt-5">
            <div className="mb-2 flex items-center justify-between text-[13.5px] text-ink-soft">
              <span>{t("subtotal")}</span>
              <span className="tabular-nums">₹{subtotal}</span>
            </div>
            {clubDiscount > 0 && (
              <div className="mb-2 flex items-center justify-between text-[13.5px] text-leaf">
                <span>Club discount</span>
                <span className="tabular-nums">−₹{clubDiscount}</span>
              </div>
            )}
            <div className="mb-3.5 flex items-center justify-between text-[13.5px] text-ink-soft">
              <span>{t("delivery")}</span>
              <span className="tabular-nums">{shipping === 0 ? "Free" : `₹${shipping}`}</span>
            </div>
            <div className="mb-5 flex items-center justify-between border-t border-line pt-4">
              <span className="text-[14px] font-semibold text-ink">{t("total")}</span>
              <span className="font-serif text-[24px] font-semibold tabular-nums text-ink">
                ₹{subtotal - clubDiscount + shipping}
              </span>
            </div>
            <Link href="/checkout" onClick={onClose} className="btn-primary w-full !py-5 !text-[14px]">
              {t("proceedToCheckout")}
              <i className="ti ti-arrow-right text-[17px]" aria-hidden="true" />
            </Link>
            <Link href="/cart" onClick={onClose} className="mt-3 block text-center text-[12.5px] text-ink-soft underline underline-offset-4">
              View full cart
            </Link>
            <p className="mt-2 text-center text-[11px] text-ink-soft">
              Coupons and loyalty points are applied at checkout.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
