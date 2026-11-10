"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Product } from "@/lib/types";
import ProductImage, { getGalleryUrls } from "../ProductImage";
import { Container } from "../ui";

// Prefer products with real photography, spread across categories so the
// composition shows range rather than three oils.
function pickShowcase(products: Product[]) {
  const withPhoto = products.filter((p) => getGalleryUrls(p).length > 0);
  const pool = withPhoto.length >= 3 ? withPhoto : products;
  // Signature Odisha products first (when they exist and have photos),
  // otherwise fall back to a spread across categories.
  const byId = (id: string) => pool.find((p) => p.id === id);
  const hero = byId("mustard-oil") ?? pool.find((p) => p.category_id === "oils") ?? pool[0];
  const rest = pool.filter((p) => p.id !== hero?.id);
  const second =
    byId("ragi-chhatua") ?? rest.find((p) => p.category_id !== hero?.category_id) ?? rest[0];
  const third =
    byId("turmeric-powder") ??
    rest.find((p) => p.id !== second?.id && p.category_id !== hero?.category_id && p.category_id !== second?.category_id) ??
    rest.find((p) => p.id !== second?.id);
  return { hero, second, third };
}

function Tile({ product, className, sizes, priority = false }: { product: Product; className: string; sizes: string; priority?: boolean }) {
  return (
    <Link
      href={`/product/${product.id}`}
      aria-label={product.name}
      className={`group block overflow-hidden bg-cream shadow-lift ring-[5px] ring-warm ${className}`}
    >
      <ProductImage
        productId={product.id}
        categoryId={product.category_id}
        alt={product.name}
        className="h-full w-full transition-transform duration-editorial ease-brand group-hover:scale-[1.04]"
        iconSize={sizes}
        imageUrl={getGalleryUrls(product)[0] ?? null}
        priority={priority}
      />
    </Link>
  );
}

// Abstract ingredient details (mustard seeds, a curry leaf, a chilli),
// drawn as simple shapes so they work with or without product photos.
function Ingredients({ depth }: { depth: "back" | "front" }) {
  if (depth === "back") {
    return (
      <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden="true">
        <circle cx="210" cy="200" r="168" fill="#E8DED1" />
        <circle cx="210" cy="200" r="168" fill="none" stroke="#B49A6A" strokeOpacity=".35" strokeDasharray="2 10" strokeLinecap="round" strokeWidth="3" />
        <circle cx="330" cy="70" r="46" fill="#B49A6A" fillOpacity=".22" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden="true">
      {[
        [352, 150, 5], [364, 172, 4], [344, 176, 3.5], [368, 140, 3], [40, 98, 4.5], [56, 112, 3.5], [30, 120, 3]
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#8F3B2B" opacity=".7" />
      ))}
      <g transform="translate(300 330) rotate(24)">
        <path d="M0 0 C 26 -34, 66 -34, 92 0 C 66 34, 26 34, 0 0 Z" fill="#304936" opacity=".92" />
        <path d="M6 0 L 84 0" stroke="#F7F2E9" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="translate(24 300) rotate(-32)">
        <path d="M0 0 C 40 -18, 92 -6, 112 18 C 84 16, 36 20, 0 0 Z" fill="#B6503B" />
        <path d="M0 0 q -10 -6 -14 -2" stroke="#304936" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function Hero({ products }: { products: Product[] }) {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const { hero, second, third } = pickShowcase(products);

  // Cursor depth: pointer position becomes two CSS variables that each
  // layer reads with a different multiplier. No React state, so no
  // re-render. Mouse only, one write per frame, off for reduced motion.
  useEffect(() => {
    const section = sectionRef.current;
    const art = artRef.current;
    if (!section || !art) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = section!.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        art!.style.setProperty("--mx", x.toFixed(3));
        art!.style.setProperty("--my", y.toFixed(3));
      });
    }
    function onLeave() {
      art!.style.setProperty("--mx", "0");
      art!.style.setProperty("--my", "0");
    }
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // --mx/--my run -0.5..0.5, so factor k gives at most +/-k/2 px of travel:
  // hero k=12 -> 6px, supporting k=6..8 -> 3-4px, ingredients k=-8 -> 4px.
  const depth = (k: number, rot = 0) => ({
    transform: `translate3d(calc(var(--mx, 0) * ${k}px), calc(var(--my, 0) * ${k}px), 0) rotate(${rot}deg)`,
    transition: "transform 0.5s cubic-bezier(.22,.9,.35,1)"
  });

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-cream">
      <Container className="grid grid-cols-1 gap-y-8 py-10 md:min-h-[560px] md:grid-cols-2 md:gap-x-10 md:py-0 lg:min-h-[600px]">
        <div className="md:col-start-1 md:row-start-1 md:self-end md:pb-6">
          <div className="eyebrow mb-5">{t("heroEyebrow")}</div>
          <h1 className="heading-display max-w-[12.5ch] text-[42px] sm:text-[54px] md:text-[62px] lg:text-[72px]">
            {t("heroTitle")}
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">{t("heroSubtitle")}</p>
        </div>

        {/* Composition: dominant product, two overlapping supporting
            products, ingredient details at two depths. */}
        <div
          ref={artRef}
          className="relative mx-auto h-[350px] w-full max-w-[400px] sm:h-[440px] sm:max-w-[480px] md:col-start-2 md:row-span-2 md:row-start-1 md:my-auto md:h-[500px] md:max-w-none lg:h-[540px]"
          style={{ ["--mx" as any]: 0, ["--my" as any]: 0 }}
        >
          <div className="absolute inset-0" style={depth(-8)}>
            <Ingredients depth="back" />
          </div>

          {hero && (
            <div className="absolute left-[6%] top-[3%] z-20 h-[78%] w-[62%]" style={depth(12, -2)}>
              <Tile product={hero} className="h-full w-full" sizes="text-6xl" priority />
            </div>
          )}
          {second && (
            <div className="absolute right-[-1%] top-[16%] z-30 h-[34%] w-[40%]" style={depth(7, 4)}>
              <Tile product={second} className="h-full w-full" sizes="text-4xl" />
            </div>
          )}
          {third && (
            <div className="absolute bottom-[4%] right-[8%] z-30 h-[30%] w-[36%]" style={depth(6, -5)}>
              <Tile product={third} className="h-full w-full" sizes="text-4xl" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 z-40" style={depth(14)}>
            <Ingredients depth="front" />
          </div>
        </div>

        <div className="md:col-start-1 md:row-start-2 md:self-start">
          <div className="flex flex-wrap gap-3">
            <a href="#shop" className="btn-primary">
              {t("shopTheRange")}
              <i className="ti ti-arrow-right text-[15px]" aria-hidden="true" />
            </a>
            <Link href="/about" className="btn-secondary">
              {t("ourProcess")}
            </Link>
          </div>
          <div className="mt-9 flex items-center gap-6 text-[12px] text-ink-soft">
            <div className="flex items-center gap-1.5">
              <i className="ti ti-leaf text-[16px] text-leaf" aria-hidden="true" />
              Cold-pressed, kachi ghani
            </div>
            <div className="flex items-center gap-1.5">
              <i className="ti ti-truck text-[16px] text-leaf" aria-hidden="true" />
              Pan-India delivery
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
