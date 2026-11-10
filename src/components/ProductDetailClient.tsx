"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WishlistButton from "@/components/WishlistButton";
import ProductGallery from "@/components/ProductGallery";
import BundleContents from "@/components/BundleContents";
import ReviewSection from "@/components/ReviewSection";
import QASection from "@/components/QASection";
import CertificateSection from "@/components/CertificateSection";
import ProductGrid from "@/components/ProductGrid";
import { Accordion, Container, Reveal, SectionHeading, TrustItem } from "@/components/ui";
import { Category, Product, ProductVariant } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useActiveMembership } from "@/lib/useActiveMembership";
import { MEMBERSHIP_DISCOUNT_PCT } from "@/lib/membership";
import { trackViewItem, trackAddToCart } from "@/lib/analytics";
import Link from "next/link";
import RestockNotify from "@/components/RestockNotify";
import PincodeChecker from "@/components/PincodeChecker";
import RecentlyViewed from "@/components/RecentlyViewed";
import { getGalleryUrls } from "@/components/ProductImage";
import { addRecent } from "@/lib/recentlyViewed";
import { isLowStock } from "@/lib/stockLevel";
import { FREE_SHIP_THRESHOLD, SHIPPING_FEE } from "@/lib/shipping";

export default function ProductDetailClient({
  product,
  categories,
  related = [],
  recipes = []
}: {
  product: Product;
  categories: Category[];
  related?: Product[];
  recipes?: { id: string; title: string; excerpt: string | null }[];
}) {
  const { qtyForVariant, addItem, changeQty } = useCart();
  const { showToast } = useToast();
  const { isMember, loading: membershipLoading } = useActiveMembership();

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

  // Remember this product for the "Recently viewed" strip (this browser only).
  useEffect(() => {
    addRecent({
      id: product.id,
      name: product.name,
      categoryId: product.category_id,
      price: defaultVariant.offer_price ?? defaultVariant.price,
      imageUrl: getGalleryUrls(product)[0] ?? null
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const qty = qtyForVariant(selected.id);
  const effectivePrice = selected.offer_price ?? selected.price;
  const discountPct = Math.round(((selected.mrp - effectivePrice) / selected.mrp) * 100);
  const isOnOffer = selected.offer_price != null;

  useEffect(() => {
    trackViewItem({ item_id: selected.id, item_name: product.name, price: effectivePrice, quantity: 1 });
  }, [selected.id, product.name, effectivePrice]);

  function handleAdd() {
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
    } else if (qty >= selected.stock_qty) {
      showToast(`Only ${selected.stock_qty} available`, "err");
    } else {
      changeQty(selected.id, 1);
    }
  }

  return (
    <>
      <Header categories={categories} />

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start animate-fadeSlideUp">
          <div className="relative">
            <ProductGallery product={product} categoryId={product.category_id} alt={product.name} variantId={selected.id} packSize={selected.pack_size} />
            {selected.is_deal_of_the_day ? (
              <span className="absolute top-0 left-0 bg-gold text-ink text-xs font-bold px-3 py-1.5 uppercase tracking-wide">
                Deal of the Day
              </span>
            ) : isOnOffer ? (
              <span className="absolute top-0 left-0 bg-gold text-ink text-xs font-bold px-3 py-1.5 uppercase tracking-wide">
                Today's Offer
              </span>
            ) : (
              discountPct > 0 && (
                <span className="absolute top-0 left-0 bg-ink text-cream text-xs font-semibold px-3 py-1.5 uppercase tracking-wide">
                  {discountPct}% off
                </span>
              )
            )}
            <WishlistButton
              productId={product.id}
              className="absolute top-4 right-4 w-9 h-9 bg-card/90 rounded-full p-2 shadow-sm"
            />
          </div>

          <div className="md:sticky md:top-28">
            <div className="eyebrow mb-3">
              {categories.find((c) => c.id === product.category_id)?.name ?? product.category_id}
            </div>
            <h1 className="text-[30px] md:text-[34px] font-semibold leading-tight tracking-tight text-ink mb-1.5">{product.name}</h1>
            <div className="text-[15px] text-ink-soft mb-5">{product.name_odia}</div>

            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-[30px] font-semibold tabular-nums text-ink">₹{effectivePrice}</span>
              {discountPct > 0 && (
                <>
                  <span className="text-base text-ink-soft line-through tabular-nums">₹{selected.mrp}</span>
                  <span className="bg-leaf px-2 py-1 text-[11px] font-semibold uppercase tracking-[.08em] text-warm">Save ₹{selected.mrp - effectivePrice} · {discountPct}% off</span>
                </>
              )}
            </div>

            {isLowStock(selected.stock_qty) && (
              <div
                role="status"
                className="mb-5 flex items-center gap-2 border border-red/30 bg-[#FBEFEA] px-3.5 py-2.5 text-[13px] font-semibold text-red-dark"
              >
                <i className="ti ti-alert-triangle text-[16px]" aria-hidden="true" />
                Running low — only {selected.stock_qty} left. Order soon.
              </div>
            )}

            {variants.length > 1 && (
              <div className="mb-6">
                <div className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold mb-2.5">
                  Pack size
                </div>
                <div className="flex gap-2 flex-wrap">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelected(v)}
                      className={`text-[13px] px-4 py-2 border font-medium transition-colors ${
                        selected.id === v.id
                          ? "bg-ink text-cream border-ink"
                          : "border-line text-ink hover:border-ink"
                      }`}
                    >
                      {v.pack_size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 flex-wrap mb-6 text-[11px] text-sage font-semibold tracking-wide uppercase">
              {["Made in Odisha", selected.pack_size].map((tag, i) => (
                <span key={tag} className="flex items-center gap-4">
                  {i > 0 && <span className="text-line">/</span>}
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-[14px] leading-7 text-ink-soft mb-7 max-w-md">{(product.description ?? "").split(/(?<=[.!?])\s/)[0]}</p>

            {qty > 0 ? (
              <div className="inline-flex items-center gap-4 bg-ink px-5 py-3">
                <button onClick={() => changeQty(selected.id, -1)} className="text-cream text-lg">
                  −
                </button>
                <span className="text-cream text-sm font-semibold min-w-[16px] text-center">{qty}</span>
                <button onClick={handleAdd} className="text-cream text-lg">
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                disabled={selected.stock_qty <= 0}
                className="btn-primary w-full md:w-auto md:min-w-[220px]"
              >
                {selected.stock_qty <= 0 ? "Out of stock" : "Add to cart"}
              </button>
            )}

            {selected.stock_qty <= 0 && <RestockNotify variantId={selected.id} packSize={selected.pack_size} />}
            <PincodeChecker />

            <button
              type="button"
              onClick={() => {
                const url = window.location.href;
                const text = `${product.name} — Divya Bharat`;
                if (navigator.share) navigator.share({ title: text, url }).catch(() => {});
                else window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
              }}
              className="mt-4 flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft hover:text-ink"
            >
              <i className="ti ti-share-3 text-[16px]" aria-hidden="true" />
              Share this product
            </button>

            <CertificateSection productId={product.id} />

            <div className="mt-6">
              {product.category_id === "bundles" && (
                <BundleContents bundleId={product.id} bundlePrice={effectivePrice} />
              )}
              {!membershipLoading && !isMember && (
                <Link
                  href="/membership"
                  className="flex items-center justify-between border border-gold-soft bg-[#FBF3E0] px-4 py-3.5 hover:border-gold transition-colors"
                >
                  <span className="text-[13px] text-ink">
                    <b className="text-gold">Divya Bharat Club:</b> get this for{" "}
                    <b>₹{Math.round(effectivePrice * (1 - MEMBERSHIP_DISCOUNT_PCT / 100))}</b> + free delivery
                  </span>
                  <span className="text-gold text-lg flex-shrink-0 ml-2">→</span>
                </Link>
              )}
            </div>

            {/* Trust points: each is something the store really does
                (delivery threshold from the cart, payment options from checkout). */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TrustItem icon="ti-leaf" title="Made in Odisha" text="Traditional processing" />
              <TrustItem icon="ti-truck-delivery" title="Free delivery" text={`On orders over ₹${FREE_SHIP_THRESHOLD}`} />
              <TrustItem icon="ti-credit-card" title="Pay your way" text="Online or cash on delivery" />
            </div>

            <div className="mt-9">
              <Accordion title="About this product" defaultOpen>
                <p className="max-w-md">{product.description}</p>
              </Accordion>
              <Accordion title="How it's made">
                <p className="max-w-md">
                  Divya Bharat products are processed in Odisha using traditional methods.{" "}
                  <Link href="/about" className="text-red-dark underline underline-offset-4">
                    Read about our process
                  </Link>
                  .
                </p>
              </Accordion>
              {product.energy_kcal !== null && (
                <Accordion title="Nutrition">
                  <div className="mb-3 text-[11px] text-ink-soft">{product.nutrition_basis ?? "per 100g"}</div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { label: "Energy", value: product.energy_kcal, unit: "kcal" },
                      { label: "Protein", value: product.protein_g, unit: "g" },
                      { label: "Fat", value: product.fat_g, unit: "g" },
                      { label: "Carbs", value: product.carbs_g, unit: "g" }
                    ].map((n) => (
                      <div key={n.label} className="border-l border-line px-3 py-1 text-center first:border-l-0">
                        <div className="font-mono text-[15px] font-semibold text-red-dark">
                          {n.value}
                          <span className="ml-0.5 font-sans text-[10px] font-normal text-ink-soft">{n.unit}</span>
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-ink-soft">{n.label}</div>
                      </div>
                    ))}
                  </div>
                  {!product.nutrition_verified && (
                    <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
                      Typical values for this food category, shown for reference, pending lab verification for this
                      specific batch.
                    </p>
                  )}
                </Accordion>
              )}
              <Accordion title="Delivery & returns">
                <p className="max-w-md">
                  Delivery is free on orders over ₹{FREE_SHIP_THRESHOLD}, otherwise ₹{SHIPPING_FEE}. Returns are accepted for damaged,
                  wrong or quality-affected items reported within 48 hours of delivery with photos.{" "}
                  <Link href="/help#returns" className="text-red-dark underline underline-offset-4">
                    Full policy
                  </Link>
                </p>
              </Accordion>
              <Accordion title="Details">
                <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
                  <div>
                    <dt className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">Pack size</dt>
                    <dd>{selected.pack_size}</dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">FSSAI status</dt>
                    <dd>Pending (pre-launch)</dd>
                  </div>
                </dl>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        <div id="reviews" className="md:pl-[calc(50%+2rem)]">
          <ReviewSection productId={product.id} />
          <QASection productId={product.id} />
        </div>
      </div>

      <RecentlyViewed currentId={product.id} />

      {/* Mobile-only sticky purchase bar, sitting just above the fixed
          bottom navigation (68px tall) so Add to cart is always one tap
          away while scrolling the long product page. */}
      <div className="pb-0 fixed inset-x-0 bottom-[68px] z-[85] flex items-center justify-between gap-4 border-t border-line bg-warm/95 px-4 py-3 backdrop-blur md:hidden">
        <div>
          <div className="text-[11px] text-ink-soft">{selected.pack_size}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-[18px] font-semibold tabular-nums text-ink">₹{effectivePrice}</span>
            {discountPct > 0 && (
              <span className="text-[12px] text-ink-soft/70 line-through tabular-nums">₹{selected.mrp}</span>
            )}
          </div>
        </div>
        {qty > 0 ? (
          <div className="flex items-center gap-4 bg-ink px-5 py-3 text-warm">
            <button onClick={() => changeQty(selected.id, -1)} className="text-lg" aria-label="Decrease quantity">
              −
            </button>
            <span className="min-w-[16px] text-center text-sm font-semibold tabular-nums">{qty}</span>
            <button onClick={handleAdd} className="text-lg" aria-label="Increase quantity">
              +
            </button>
          </div>
        ) : (
          <button onClick={handleAdd} disabled={selected.stock_qty <= 0} className="btn-primary flex-1 max-w-[200px]">
            {selected.stock_qty <= 0 ? "Out of stock" : "Add to cart"}
          </button>
        )}
      </div>

      {recipes.length > 0 && (
        <section className="border-t border-line py-10">
          <Container>
            <h2 className="mb-4 font-serif text-[22px] font-semibold text-ink">Recipes &amp; guides using {product.name}</h2>
            <ul className="grid gap-4 sm:grid-cols-3">
              {recipes.map((r) => (
                <li key={r.id}>
                  <Link href={`/blog/${r.id}`} className="block border border-line bg-warm p-4 hover:border-ink">
                    <div className="font-semibold text-ink">{r.title}</div>
                    {r.excerpt && <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-soft">{r.excerpt}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {related.length > 0 && (
        <section className="section-pad border-t border-line bg-cream-2">
          <Container>
            <Reveal>
              <SectionHeading eyebrow="Pairs well" title="You might also like" />
            </Reveal>
            <ProductGrid products={related} loading={false} />
          </Container>
        </section>
      )}

      <Footer />
    </>
  );
}
