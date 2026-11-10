"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Category, Product } from "@/lib/types";
import ProductImage, { getGalleryUrls } from "../ProductImage";

// Signature interaction. The section is tall; its inner panel is
// `position: sticky`, and scroll progress through the section decides
// which category is "on the shelf". The page scrolls completely normally:
// nothing intercepts the wheel or touch. Background tone, type and image
// all change with the active category.
const FLOW_ORDER = ["oils", "chhatua", "spices", "dal", "papad"];
const TONE: Record<string, string> = {
  oils: "#EBD59B",
  chhatua: "#E2D5B0",
  spices: "#EBC3AE",
  dal: "#D3D8AE",
  papad: "#EDD7B2"
};
const LINE: Record<string, string> = {
  oils: "Cold-pressed the traditional kachi ghani way.",
  chhatua: "A traditional Odisha staple, stone-ground.",
  spices: "Everyday spices, packed in Odisha.",
  dal: "Everyday dal for the daily pot.",
  papad: "Crisp and simple, made for the end of a meal."
};

export default function PantryFlow({ categories, products }: { categories: Category[]; products: Product[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  const shelves = FLOW_ORDER.map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => !!c)
    .map((category) => {
      const inCat = products.filter((p) => p.category_id === category.id);
      return { category, count: inCat.length, cover: inCat.find((p) => getGalleryUrls(p).length > 0) ?? inCat[0] };
    })
    .filter((s) => s.count > 0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || shelves.length < 2) return;
    let raf = 0;
    function update() {
      const rect = el!.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const p = Math.max(0, Math.min(0.9999, -rect.top / Math.max(scrollable, 1)));
      const idx = Math.floor(p * shelves.length);
      setActive((cur) => (cur === idx ? cur : idx));
    }
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelves.length]);

  if (shelves.length < 2) return null;
  const current = shelves[active];
  const tone = TONE[current.category.id] ?? "#E9DDC5";

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: `${shelves.length * 65 + 25}vh`, backgroundColor: tone, transition: "background-color 700ms cubic-bezier(.22,.9,.35,1)" }}
      aria-label="Walk through the pantry"
    >
      <div className="sticky top-[104px] flex h-[calc(100vh-104px)] items-center overflow-hidden md:top-[128px] md:h-[calc(100vh-128px)]">
        <div className="container-page grid w-full grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-16">
          <div className="order-2 md:order-1">
            <div className="eyebrow mb-4 flex items-center gap-3">
              <span className="tabular-nums">{String(active + 1).padStart(2, "0")}</span>
              <span className="h-px w-8 bg-red/60" aria-hidden="true" />
              <span className="tabular-nums text-ink-soft">{String(shelves.length).padStart(2, "0")}</span>
            </div>
            {/* key remounts the block so the editorial fade replays per shelf */}
            <div key={current.category.id} className="animate-fadeSlideUp">
              <h2 className="font-serif text-[44px] font-bold uppercase leading-[.92] tracking-[-0.03em] text-ink sm:text-[58px] md:text-[72px] lg:text-[88px]">
                {current.category.name}
              </h2>
              <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink/75">
                {LINE[current.category.id] ?? ""}
              </p>
              <Link href={`/collections/${current.category.id}`} className="btn-dark mt-7">
                Shop {current.category.name.toLowerCase()} ({current.count})
                <i className="ti ti-arrow-up-right text-[15px]" aria-hidden="true" />
              </Link>
            </div>
            <ol className="mt-8 flex flex-wrap gap-x-5 gap-y-2" aria-label="Pantry shelves">
              {shelves.map((s, i) => (
                <li
                  key={s.category.id}
                  className={`text-[11px] font-semibold uppercase tracking-eyebrow transition-colors duration-base ${
                    i === active ? "text-ink" : "text-ink/35"
                  }`}
                  aria-current={i === active ? "true" : undefined}
                >
                  {s.category.name}
                </li>
              ))}
            </ol>
          </div>

          <div className="relative order-1 mx-auto aspect-[5/4] w-full max-w-[560px] md:order-2 md:aspect-[4/5] md:max-w-[520px]">
            {shelves.map((s, i) => (
              <div
                key={s.category.id}
                aria-hidden={i !== active}
                className={`absolute inset-0 overflow-hidden shadow-lift transition-all duration-editorial ease-brand ${
                  i === active ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-[.97] opacity-0"
                }`}
              >
                {s.cover && (
                  <ProductImage
                    productId={s.cover.id}
                    categoryId={s.category.id}
                    alt={i === active ? s.cover.name : ""}
                    className="h-full w-full"
                    iconSize="text-6xl"
                    imageUrl={getGalleryUrls(s.cover)[0] ?? null}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
