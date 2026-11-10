"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProductImage, { getGalleryUrls, resolveVariantGallery } from "@/components/ProductImage";
import Pack3D from "@/components/pantry/Pack3D";
import { Category, Product } from "@/lib/types";
import { buildPantrySections, defaultVariantOf, variantsOf } from "@/lib/pantry";
import { usePantryMode } from "@/lib/usePantryMode";
import { isLowStock } from "@/lib/stockLevel";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

const OILS_CATEGORY = "oils"; // the real category id in the categories table

// The oil range on a slowly turning pedestal. Pick a bottle: it turns to the
// front and its real name, pack sizes, price and cart button appear as HTML.
// The bottles are flat product photos that always face the viewer — this is a
// rotating display, not a 360° model. Phones and reduced-motion visitors get a
// swipeable row with the same selection panel.
export default function OilTurntable({ categories, products }: { categories: Category[]; products: Product[] }) {
  const mode = usePantryMode();
  const oils = useMemo(
    () => buildPantrySections(categories.filter((c) => c.id === OILS_CATEGORY), products, 8)[0]?.products ?? [],
    [categories, products]
  );
  const category = categories.find((c) => c.id === OILS_CATEGORY);
  const [sel, setSel] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => setFlipped(false), [sel]);

  if (!mode) return <div className="min-h-[60vh]" aria-hidden="true" />;
  if (oils.length === 0 || !category) return null;
  const spin = mode === "3d" && oils.length >= 3;

  return (
    <section className="section-pad overflow-hidden bg-cream-2" aria-label={category.name}>
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="text-[11px] font-semibold uppercase tracking-[.22em] text-sage">The Oil Pedestal</div>
        <h2 className="mb-8 mt-1 font-serif text-[32px] font-semibold leading-tight text-ink md:text-[42px]">{category.name}</h2>

        <div className="grid items-center gap-8 md:grid-cols-[1.25fr_1fr]">
          {spin ? <Turntable oils={oils} sel={sel} setSel={setSel} flipped={flipped} /> : <SwipeRow oils={oils} sel={sel} setSel={setSel} />}
          <DetailPanel
            product={sel === null ? null : oils[sel]}
            onRelease={spin ? () => setSel(null) : undefined}
            onFlip={spin ? () => setFlipped((f) => !f) : undefined}
            flipped={flipped}
          />
        </div>
      </div>
    </section>
  );
}

function Turntable({
  oils,
  sel,
  setSel,
  flipped
}: {
  oils: Product[];
  sel: number | null;
  setSel: (i: number | null) => void;
  flipped: boolean;
}) {
  const n = oils.length;
  const SIZE = 170;
  const R = Math.round(Math.max(290, (SIZE * 1.15) / (2 * Math.tan(Math.PI / n)) + 40)); // ring wide enough that packs never overlap
  const ringRef = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const selRef = useRef<number | null>(sel);
  const hover = useRef(false);
  selRef.current = sel;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = selRef.current;
      if (s !== null) {
        // ease the chosen bottle round to the front by the shortest way
        const diff = ((((-(s * 360) / n) - angle.current) % 360) + 540) % 360 - 180;
        angle.current += diff * Math.min(1, dt * 6);
      } else if (!hover.current) {
        angle.current += dt * 7; // one lap in ~50s
      }
      if (ringRef.current) ringRef.current.style.transform = `translateZ(${-R}px) rotateY(${angle.current}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n, R]);

  return (
    <div
      className="relative h-[470px]"
      style={{ perspective: 1500, perspectiveOrigin: "50% 38%" }}
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
    >
      <div className="pantry-pedestal" aria-hidden="true">
        <div className="pantry-pedestal-disc" style={{ animationPlayState: sel === null ? "running" : "paused" }} />
      </div>
      <div ref={ringRef} className="absolute bottom-[140px] left-1/2 h-0 w-0" style={{ transformStyle: "preserve-3d" }}>
        {oils.map((p, i) => {
          const urls = getGalleryUrls(p);
          const front = resolveVariantGallery(p, defaultVariantOf(p).id).urls[0] ?? urls[0] ?? null;
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${p.name}`}
              aria-pressed={sel === i}
              onClick={() => setSel(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(i)}
              className="absolute cursor-pointer"
              style={{
                left: -SIZE / 2,
                bottom: 0,
                width: SIZE,
                transformStyle: "preserve-3d",
                transform: `rotateY(${(i * 360) / n}deg) translateZ(${R}px)`
              }}
            >
              <Pack3D frontUrl={front} backUrl={urls[1] ?? null} size={SIZE} flipped={sel === i && flipped} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SwipeRow({ oils, sel, setSel }: { oils: Product[]; sel: number | null; setSel: (i: number | null) => void }) {
  return (
    <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 md:mx-0 md:px-0">
      {oils.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setSel(i)}
          aria-pressed={sel === i}
          aria-label={`Select ${p.name}`}
          className={`w-[168px] flex-shrink-0 snap-center text-center transition-transform ${sel === i ? "scale-[1.04]" : ""}`}
        >
          <span className={`pantry-plate-img block aspect-square w-full overflow-hidden bg-cream ${sel === i ? "ring-2 ring-red" : ""}`}>
            <ProductImage
              productId={p.id}
              categoryId={p.category_id}
              alt=""
              className="h-full w-full"
              iconSize="text-3xl"
              imageUrl={resolveVariantGallery(p, defaultVariantOf(p).id).urls[0] ?? null}
              thumb
            />
          </span>
          <span className="mt-2 block text-[13px] font-semibold text-ink">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

function DetailPanel({
  product,
  onRelease,
  onFlip,
  flipped
}: {
  product: Product | null;
  onRelease?: () => void;
  onFlip?: () => void;
  flipped?: boolean;
}) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [variantId, setVariantId] = useState<string | null>(null);

  useEffect(() => {
    setVariantId(product ? defaultVariantOf(product).id : null);
  }, [product]);

  if (!product) {
    return (
      <div className="border border-line bg-warm px-6 py-8 text-[14px] leading-relaxed text-ink-soft" aria-live="polite">
        Choose a bottle to bring it forward and see its pack sizes and price.
      </div>
    );
  }

  const vs = variantsOf(product);
  const v = vs.find((x) => x.id === variantId) ?? defaultVariantOf(product);
  const price = v.offer_price ?? v.price;
  const soldOut = v.stock_qty <= 0;

  function add() {
    addItem(
      {
        productId: product!.id,
        variantId: v.id,
        packSize: v.pack_size,
        name: product!.name,
        nameOdia: product!.name_odia,
        price,
        categoryId: product!.category_id
      },
      1
    );
    showToast(`${product!.name} (${v.pack_size}) added to cart`);
  }

  return (
    <div className="border border-line bg-warm px-6 py-7" aria-live="polite">
      <h3 className="font-serif text-[30px] font-semibold leading-tight text-ink">{product.name}</h3>
      {product.name_odia && <div className="mt-0.5 text-[13px] text-ink-soft">{product.name_odia}</div>}

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Pack size">
        {vs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setVariantId(x.id)}
            aria-pressed={x.id === v.id}
            className={`border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              x.id === v.id ? "border-ink bg-ink text-cream" : "border-line text-ink hover:border-ink"
            }`}
          >
            {x.pack_size}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-baseline gap-2.5">
        <span className="font-serif text-[32px] font-semibold tabular-nums text-ink">₹{price}</span>
        {v.mrp > price && <span className="text-[14px] tabular-nums text-ink-soft line-through">₹{v.mrp}</span>}
      </div>

      {isLowStock(v.stock_qty) && (
        <div role="status" className="mt-3 text-[12.5px] font-semibold text-red-dark">
          Running low — only {v.stock_qty} left.
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={add} disabled={soldOut} className="btn-primary">
          {soldOut ? "Out of stock" : "Add to cart"}
        </button>
        <Link href={`/product/${product.id}`} className="btn-secondary">
          View details
        </Link>
      </div>
      {onFlip && (
        <button type="button" onClick={onFlip} className="mt-4 mr-5 text-[12px] font-semibold text-red underline-offset-4 hover:underline">
          {flipped ? "Show front" : "Show back of pack"}
        </button>
      )}
      {onRelease && (
        <button type="button" onClick={onRelease} className="mt-4 text-[12px] text-ink-soft underline-offset-4 hover:underline">
          Resume turning
        </button>
      )}
    </div>
  );
}
