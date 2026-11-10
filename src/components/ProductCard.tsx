"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Product, ProductVariant } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { isLowStock } from "@/lib/stockLevel";
import ProductImage, { resolveVariantGallery } from "./ProductImage";
import WishlistButton from "./WishlistButton";
import { Badge, Price, Rating } from "./ui";
import { trackAddToCart } from "@/lib/analytics";

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { qtyForVariant, addItem, changeQty } = useCart();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const variants: ProductVariant[] =
    product.variants && product.variants.length > 0
      ? product.variants
      : [
          {
            id: `${product.id}-default`,
            product_id: product.id,
            pack_size: product.pack_size,
            price: product.price,
            mrp: product.mrp,
            stock_qty: product.stock_qty,
            is_default: true,
            sort_order: 0
          }
        ];

  const defaultVariant = useMemo(
    () => variants.find((v) => v.offer_price != null) ?? variants.find((v) => v.is_default) ?? variants[0],
    [variants]
  );
  const [selected, setSelected] = useState<ProductVariant>(defaultVariant);
  const [justAdded, setJustAdded] = useState(false);
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1400);
    return () => clearTimeout(t);
  }, [justAdded]);

  const backUrl = resolveVariantGallery(product, selected.id).urls[1] ?? null;
  const qty = qtyForVariant(selected.id);
  const effectivePrice = selected.offer_price ?? selected.price;
  const discountPct = Math.round(((selected.mrp - effectivePrice) / selected.mrp) * 100);
  const isOnOffer = selected.offer_price != null;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (qty === 0) {
      addItem(
        {
          productId: product.id,
          variantId: selected.id,
          packSize: selected.pack_size,
          name: product.name,
          nameOdia: product.name_odia,
          price: effectivePrice,
          categoryId: product.category_id
        },
        1
      );
      trackAddToCart({ item_id: selected.id, item_name: product.name, price: effectivePrice, quantity: 1 });
      showToast(`${product.name} (${selected.pack_size}) added to cart`);
      setJustAdded(true);
    } else {
      changeQty(selected.id, 1);
    }
  }

  const outOfStock = selected.stock_qty <= 0;
  const descriptor = (product.description ?? "").split(/[.\n]/)[0].trim();

  // Desktop hover bar: quick add, or the stepper once it's in the cart.
  const hoverBar =
    qty > 0 ? (
      <div className="flex items-center justify-between bg-ink px-4 py-3 text-warm">
        <button
          onClick={(e) => {
            e.preventDefault();
            changeQty(selected.id, -1);
          }}
          aria-label="Decrease quantity"
          className="flex h-6 w-6 items-center justify-center"
        >
          <i className="ti ti-minus" style={{ fontSize: 15 }} aria-hidden="true" />
        </button>
        <span className="text-[13px] font-semibold tabular-nums">{qty} in cart</span>
        <button onClick={handleAdd} aria-label="Increase quantity" className="flex h-6 w-6 items-center justify-center">
          <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
        </button>
      </div>
    ) : (
      <button
        onClick={handleAdd}
        disabled={outOfStock}
        className="w-full bg-ink px-4 py-3.5 text-[11.5px] font-semibold uppercase tracking-[.12em] text-warm hover:bg-red disabled:opacity-60"
      >
        {outOfStock ? "Out of stock" : justAdded ? "Added ✓" : "Add to cart"}
      </button>
    );

  return (
    <div
      className="group relative flex flex-col animate-fadeSlideUp"
      style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
    >
      <div className="relative overflow-hidden bg-cream-2" onMouseEnter={() => setPeek(true)}>
        <Link href={`/product/${product.id}`} className="block" aria-label={product.name}>
          <div className="relative aspect-square w-full overflow-hidden">
            <ProductImage
              productId={product.id}
              categoryId={product.category_id}
              alt={product.name}
              className="h-full w-full transition-transform duration-base ease-brand md:group-hover:-translate-y-1.5 md:group-hover:scale-[1.06]"
              iconSize="text-5xl"
              imageUrl={resolveVariantGallery(product, selected.id).urls[0] ?? null}
                thumb
            />
            {/* Desktop hover: show the back of the pack. Loaded only after the first hover,
                so a grid of cards never downloads a second photo each up front. */}
            {peek && backUrl && (
              <div className="pointer-events-none absolute inset-0 hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block">
                <ProductImage
                  productId={product.id}
                  categoryId={product.category_id}
                  alt=""
                  className="h-full w-full"
                  iconSize="text-5xl"
                  imageUrl={backUrl}
                  thumb
                />
              </div>
            )}
          </div>
        </Link>

        <div className="pointer-events-none absolute left-0 top-0 flex flex-col items-start gap-1">
          {selected.is_deal_of_the_day ? (
            <Badge tone="turmeric">Deal of the Day</Badge>
          ) : isOnOffer ? (
            <Badge tone="turmeric">Today's Pick</Badge>
          ) : (
            discountPct > 0 && <Badge>{discountPct}% off</Badge>
          )}
          {outOfStock && <Badge tone="leaf">Sold out</Badge>}
          {!outOfStock && isLowStock(selected.stock_qty) && <Badge tone="turmeric">Only {selected.stock_qty} left</Badge>}
        </div>

        <WishlistButton
          productId={product.id}
          className="absolute right-2.5 top-2.5 h-8 w-8 rounded-full bg-warm/90 p-2 opacity-90 shadow-sm transition-all duration-base md:group-hover:scale-110 md:group-hover:opacity-100 md:group-hover:shadow-md"
        />

        {/* Desktop-only slide-up quick add. Touch devices use the button in
            the info row below instead, since there's no hover. */}
        <div className="absolute inset-x-0 bottom-0 hidden translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0 md:block">
          {hoverBar}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 pt-4">
        <Link href={`/product/${product.id}`} className="block">
          <h3 className="text-[14px] font-semibold leading-snug text-ink md:text-[15px]">{product.name}</h3>
          <p className="mt-1 line-clamp-1 text-[12px] text-ink-soft">{descriptor || product.name_odia}</p>
        </Link>

        <Rating value={product.avg_rating ?? null} count={product.review_count} />

        {variants.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={(e) => {
                  e.preventDefault();
                  setSelected(v);
                }}
                className={`border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  selected.id === v.id
                    ? "border-ink bg-ink text-warm"
                    : "border-line text-ink-soft hover:border-ink"
                }`}
              >
                {v.pack_size}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-[11.5px] font-medium text-ink-soft">{selected.pack_size}</div>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          <Price price={effectivePrice} mrp={discountPct > 0 ? selected.mrp : undefined} />

          {/* Touch add — hidden on desktop where the hover bar takes over. */}
          <div className="md:hidden">
            {qty > 0 ? (
              <div className="flex items-center gap-2 border border-ink px-1.5 py-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    changeQty(selected.id, -1);
                  }}
                  className="flex h-7 w-7 items-center justify-center"
                  aria-label="Decrease quantity"
                >
                  <i className="ti ti-minus" style={{ fontSize: 14 }} aria-hidden="true" />
                </button>
                <span className="min-w-[14px] text-center text-[13px] font-semibold tabular-nums">{qty}</span>
                <button
                  onClick={handleAdd}
                  className="flex h-7 w-7 items-center justify-center"
                  aria-label="Increase quantity"
                >
                  <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                disabled={outOfStock}
                aria-label={t("add")}
                className="flex h-10 items-center gap-1.5 bg-ink px-4 text-[11px] font-semibold uppercase tracking-[.1em] text-warm hover:bg-red disabled:opacity-60"
              >
                {justAdded ? "Added ✓" : t("add")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
