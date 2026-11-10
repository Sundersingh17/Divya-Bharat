"use client";

import Link from "next/link";
import { useState } from "react";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { trackAddToCart } from "@/lib/analytics";
import ProductCard from "./ProductCard";
import ProductImage, { getGalleryUrls } from "./ProductImage";
import WishlistButton from "./WishlistButton";
import { Container, Price, Rating, Reveal, SectionHeading } from "./ui";

// Each Product here carries exactly one variant (the one the offer is on),
// pre-merged with offer_price / is_deal_of_the_day by
// lib/catalog.ts#getActiveDailyOffers. Cart behaviour below is the same
// addItem/changeQty contract ProductCard uses; only presentation is new.
function DealOfTheDay({ product }: { product: Product }) {
  const variant = product.variants![0];
  const price = variant.offer_price ?? variant.price;
  const savings = Math.max(0, variant.mrp - price);
  const pct = variant.mrp > 0 ? Math.round((savings / variant.mrp) * 100) : 0;
  const { qtyForVariant, addItem, changeQty } = useCart();
  const { showToast } = useToast();
  const [q, setQ] = useState(1);
  const inCart = qtyForVariant(variant.id);
  const soldOut = variant.stock_qty <= 0;

  function add() {
    if (inCart === 0) {
      addItem(
        {
          productId: product.id,
          variantId: variant.id,
          packSize: variant.pack_size,
          name: product.name,
          nameOdia: product.name_odia,
          price,
          categoryId: product.category_id
        },
        q
      );
      trackAddToCart({ item_id: variant.id, item_name: product.name, price, quantity: q });
    } else {
      changeQty(variant.id, q);
    }
    showToast(`${product.name} (${variant.pack_size}) added to cart`);
  }

  return (
    <div className="grid grid-cols-1 overflow-hidden bg-warm shadow-lift md:grid-cols-2">
      <Link href={`/product/${product.id}`} className="group relative block aspect-[5/4] overflow-hidden bg-cream-2 md:aspect-auto md:min-h-[380px]" aria-label={product.name}>
        <ProductImage
          productId={product.id}
          categoryId={product.category_id}
          alt={product.name}
          className="h-full w-full transition-transform duration-editorial ease-brand group-hover:scale-[1.04]"
          iconSize="text-6xl"
          imageUrl={getGalleryUrls(product)[0] ?? null}
                thumb
        />
        <span className="badge-turmeric absolute left-0 top-0">Deal of the Day</span>
      </Link>

      <div className="relative flex flex-col justify-center p-6 md:p-9">
        <WishlistButton productId={product.id} className="absolute right-5 top-5 h-9 w-9 rounded-full bg-cream p-2" />
        <div className="eyebrow mb-3">Deal of the Day</div>
        <Link href={`/product/${product.id}`}>
          <h3 className="font-serif text-[26px] font-semibold leading-[1.08] tracking-tight text-ink md:text-[34px]">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1.5 text-[13px] text-ink-soft">
          {product.name_odia} · {variant.pack_size}
        </div>
        <div className="mt-4">
          <Rating value={product.avg_rating ?? null} count={product.review_count} size="text-[13px]" />
        </div>

        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Price price={price} mrp={savings > 0 ? variant.mrp : undefined} size="lg" />
          {savings > 0 && (
            <span className="bg-leaf px-2 py-1 text-[11px] font-semibold uppercase tracking-[.08em] text-warm">
              You save ₹{savings}{pct > 0 ? ` (${pct}%)` : ""}
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-stretch gap-3">
          <div className="inline-flex items-center border border-ink/70" role="group" aria-label="Quantity">
            <button
              onClick={() => setQ((n) => Math.max(1, n - 1))}
              className="flex h-12 w-11 items-center justify-center hover:bg-ink hover:text-warm"
              aria-label="Decrease quantity"
            >
              <i className="ti ti-minus text-[14px]" aria-hidden="true" />
            </button>
            <span className="min-w-[34px] text-center text-[14px] font-semibold tabular-nums" aria-live="polite">{q}</span>
            <button
              onClick={() => setQ((n) => Math.min(20, n + 1))}
              className="flex h-12 w-11 items-center justify-center hover:bg-ink hover:text-warm"
              aria-label="Increase quantity"
            >
              <i className="ti ti-plus text-[14px]" aria-hidden="true" />
            </button>
          </div>
          <button onClick={add} disabled={soldOut} className="btn-primary h-12 flex-1 md:min-w-[200px] md:flex-none">
            {soldOut ? "Out of stock" : "Add to cart"}
          </button>
        </div>
        <p className="mt-4 text-[11.5px] text-ink-soft">While it lasts. Offers are set daily.</p>
      </div>
    </div>
  );
}

export default function DailyOffers({ offers }: { offers: Product[] }) {
  if (!offers || offers.length === 0) return null;

  const dealOfDay = offers.find((p) => p.variants?.[0]?.is_deal_of_the_day) ?? offers[0];
  const rest = offers.filter((p) => p !== dealOfDay);

  return (
    <section className="section-pad bg-turmeric">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Fresh today" title="Today's Pantry Picks" />
        </Reveal>

        <Reveal>
          <DealOfTheDay product={dealOfDay} />
        </Reveal>

        {rest.length > 0 && (
          <div className="mt-10">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-serif text-[22px] font-semibold text-ink">More picks today</h3>
              <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink/70 md:hidden">Swipe →</span>
            </div>
            <div className="scrollbar-none -mx-5 flex snap-x gap-5 overflow-x-auto px-5 md:mx-0 md:px-0">
              {rest.map((p) => (
                <div key={p.id} className="w-[58vw] flex-shrink-0 snap-start bg-warm p-3 sm:w-[34vw] md:w-[calc(25%-15px)]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
