"use client";

import { useRef } from "react";
import { Product } from "@/lib/types";
import ProductCard from "../ProductCard";
import { Container, Reveal, SectionHeading } from "../ui";

// "Favourites" ranks by review volume x rating. The store has no sales
// field, so this is an honest proxy that sharpens as reviews arrive.
export default function CustomerFavourites({ products }: { products: Product[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const ranked = [...products]
    .filter((p) => (p.review_count ?? 0) > 0)
    .sort((a, b) => (b.review_count ?? 0) * (b.avg_rating ?? 0) - (a.review_count ?? 0) * (a.avg_rating ?? 0));
  const featured = (ranked.length >= 4 ? ranked : products).slice(0, 8);

  if (featured.length === 0) return null;

  function scrollRail(dir: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrow =
    "hidden h-11 w-11 items-center justify-center border border-ink/70 text-ink hover:bg-ink hover:text-warm md:flex";

  return (
    <section className="section-pad bg-cream">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Loved by regulars"
            title="Customer Favourites"
            subtitle="Products that keep finding their way back into the pantry."
            action={
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-soft md:hidden">Swipe →</span>
                <button onClick={() => scrollRail(-1)} className={arrow} aria-label="Previous products">
                  <i className="ti ti-arrow-left text-[18px]" aria-hidden="true" />
                </button>
                <button onClick={() => scrollRail(1)} className={arrow} aria-label="Next products">
                  <i className="ti ti-arrow-right text-[18px]" aria-hidden="true" />
                </button>
              </div>
            }
          />
        </Reveal>
      </Container>

      {/* 76vw cards leave a sliver of the next one visible (~1.25 cards)
          so swiping is obvious. Desktop shows 4 at a time. */}
      <div
        ref={railRef}
        className="scrollbar-none container-page flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth md:gap-7"
        tabIndex={0}
        role="group"
        aria-label="Customer favourites, scroll horizontally"
      >
        {featured.map((p, i) => (
          <div key={p.id} className="w-[76vw] flex-shrink-0 snap-start sm:w-[42vw] md:w-[calc(25%-21px)]">
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
