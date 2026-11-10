"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Category, Product } from "@/lib/types";
import { buildPantrySections, PantrySection } from "@/lib/pantry";
import { usePantryMode } from "@/lib/usePantryMode";
import PantryPlate from "@/components/pantry/PantryPlate";

const GAP = 760; // depth between shelves, px
const STAGE_TOP = 96; // below the sticky header
const SCROLL_PER_SHELF = 80; // vh of scrolling to walk from one shelf to the next

// THE HERITAGE PANTRY — a perspective aisle of shelves, one per real category.
// Scrolling walks the camera down the aisle (CSS 3D transforms, no WebGL and no
// extra dependency). Phones and reduced-motion visitors get plain swipeable
// shelves instead. Every product, price and link comes from the live catalogue.
export default function HeritagePantry({ categories, products }: { categories: Category[]; products: Product[] }) {
  const mode = usePantryMode();
  const wide = useMemo(() => buildPantrySections(categories, products, 5), [categories, products]);
  const narrow = useMemo(() => buildPantrySections(categories, products, 8), [categories, products]);

  if (!mode) return <div className="min-h-[60vh]" aria-hidden="true" />;
  const sections = mode === "3d" ? wide : narrow;
  if (sections.length === 0) return null;
  return mode === "3d" ? <Aisle3D sections={sections} /> : <Shelves2D sections={sections} />;
}

function Aisle3D({ sections }: { sections: PantrySection[] }) {
  const n = sections.length;
  const outerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const shelfRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [plate, setPlate] = useState(170);
  useEffect(() => {
    const fit = () => setPlate(Math.round(Math.min(1080, window.innerWidth * 0.88) * 0.17));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const outer = outerRef.current;
      if (!outer) return;
      const total = Math.max(1, outer.offsetHeight - (window.innerHeight - STAGE_TOP));
      const p = Math.min(1, Math.max(0, (STAGE_TOP - outer.getBoundingClientRect().top) / total));
      const pos = p * (n - 1);
      shelfRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = pos - i; // > 0: the camera has walked past this shelf
        const opacity = d > 0 ? Math.max(0, 1 - d * 1.6) : Math.max(0, 1 + d * 0.78);
        el.style.opacity = String(opacity);
        el.style.visibility = opacity < 0.01 ? "hidden" : "visible";
        el.style.transform = `translate3d(0, ${d < 0 ? d * 56 : 0}px, ${d * GAP}px)`;
      });
      const a = Math.round(pos);
      if (a !== activeRef.current) {
        activeRef.current = a;
        setActive(a);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [n]);

  // Gentle depth: the whole room leans a few degrees toward the pointer.
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    if (roomRef.current) roomRef.current.style.transform = `rotateY(${x * 5}deg) rotateX(${-y * 2.5}deg)`;
  }, []);
  const onLeave = useCallback(() => {
    if (roomRef.current) roomRef.current.style.transform = "rotateY(0deg) rotateX(0deg)";
  }, []);

  const goTo = (i: number) => {
    const outer = outerRef.current;
    if (!outer) return;
    const total = Math.max(1, outer.offsetHeight - (window.innerHeight - STAGE_TOP));
    const top = window.scrollY + outer.getBoundingClientRect().top - STAGE_TOP + (n > 1 ? i / (n - 1) : 0) * total;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const current = sections[Math.min(active, n - 1)];

  return (
    <section aria-label="The Heritage Pantry">
      <div ref={outerRef} style={{ height: `calc((100vh - ${STAGE_TOP}px) + ${(n - 1) * SCROLL_PER_SHELF}vh)` }}>
        <div
          className="pantry-stage sticky overflow-hidden"
          style={{ top: STAGE_TOP, height: `calc(100vh - ${STAGE_TOP}px)` }}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <div className="pantry-floor" aria-hidden="true" />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-10 pt-7">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.22em] text-sage">The Heritage Pantry</div>
              <h2 className="mt-1 font-serif text-[40px] font-semibold leading-none text-ink">{current.category.name}</h2>
            </div>
            <Link
              href={`/collections/${current.category.id}`}
              className="pointer-events-auto mt-2 text-[13px] font-semibold text-red underline-offset-4 hover:underline"
            >
              Shop all {current.category.name} →
            </Link>
          </div>

          <div className="pantry-room absolute inset-0" ref={roomRef} style={{ perspective: 1100 }}>
            {sections.map((s, i) => (
              <div
                key={s.category.id}
                ref={(el) => {
                  shelfRefs.current[i] = el;
                }}
                className="absolute inset-0 flex flex-col items-center justify-end px-[6%] pb-[88px] pt-[120px]"
                style={{ willChange: "transform, opacity", pointerEvents: i === active ? "auto" : "none" }}
                aria-hidden={i !== active}
              >
                <div className="flex w-full max-w-[1080px] items-end justify-center gap-[2.4%]">
                  {s.products.map((p, pi) => (
                    <div key={p.id} className="w-[17%] min-w-0">
                      <PantryPlate product={p} part="image" tabIndex={-1} three={{ size: plate, index: pi + i }} />
                    </div>
                  ))}
                </div>
                <div className="pantry-plank mt-0 w-full max-w-[1160px]" />
                <div className="mt-3 flex w-full max-w-[1080px] items-start justify-center gap-[2.4%]">
                  {s.products.map((p) => (
                    <div key={p.id} className="w-[17%] min-w-0">
                      <PantryPlate product={p} part="label" tabIndex={i === active ? 0 : -1} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 pb-4">
            <div className="flex flex-wrap justify-center gap-2 px-6" role="tablist" aria-label="Pantry sections">
              {sections.map((s, i) => (
                <button
                  key={s.category.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => goTo(i)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    i === active ? "border-ink bg-ink text-cream" : "border-line bg-warm/80 text-ink hover:border-ink"
                  }`}
                >
                  {s.category.name}
                </button>
              ))}
            </div>
            <a href="#shop" className="text-[11.5px] text-ink-soft underline-offset-4 hover:underline">
              Skip the pantry — browse all products
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Shelves2D({ sections }: { sections: PantrySection[] }) {
  return (
    <section className="section-pad bg-cream" aria-label="The Heritage Pantry">
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="text-[11px] font-semibold uppercase tracking-[.22em] text-sage">The Heritage Pantry</div>
        <h2 className="mb-8 mt-1 font-serif text-[32px] font-semibold leading-tight text-ink">Walk the shelves</h2>
        {sections.map((s) => (
          <div key={s.category.id} className="mb-9">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="font-serif text-[22px] font-semibold text-ink">{s.category.name}</h3>
              <Link href={`/collections/${s.category.id}`} className="text-[12.5px] font-semibold text-red">
                View all →
              </Link>
            </div>
            <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1">
              {s.products.map((p) => (
                <div key={p.id} className="w-[148px] flex-shrink-0 snap-start md:w-[176px]">
                  <PantryPlate product={p} />
                </div>
              ))}
            </div>
            <div className="pantry-plank -mx-5 mt-2 md:mx-0" />
          </div>
        ))}
      </div>
    </section>
  );
}
