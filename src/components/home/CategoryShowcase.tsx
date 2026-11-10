"use client";

import Link from "next/link";
import { Category, Product } from "@/lib/types";
import ProductImage, { getGalleryUrls } from "../ProductImage";
import { Container, Reveal, SectionHeading } from "../ui";
import { composePantry } from "./compose";

// Full class names (not built dynamically) so Tailwind can see them.
const COLS: Record<number, string> = {
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  12: "lg:col-span-12"
};
const ROWS: Record<number, string> = { 2: "lg:row-span-2", 3: "lg:row-span-3", 4: "lg:row-span-4" };
const ORDER = ["oils", "spices", "dal", "chhatua", "flours", "papad"];

export default function CategoryShowcase({ categories, products }: { categories: Category[]; products: Product[] }) {
  const tiles = categories
    .map((c) => {
      const inCategory = products.filter((p) => p.category_id === c.id);
      const cover = inCategory.find((p) => getGalleryUrls(p).length > 0) ?? inCategory[0];
      return { category: c, count: inCategory.length, cover };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.category.id);
      const ib = ORDER.indexOf(b.category.id);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  if (tiles.length === 0) return null;

  // Desktop footprint is generated from the real count, so the gallery
  // always fills its width with no holes (see compose.ts).
  const places = composePantry(tiles.length);
  const n = tiles.length;

  return (
    <section className="section-pad bg-warm">
      <Container>
        <Reveal>
          <SectionHeading variant="editorial" eyebrow="The Pantry" title="Shop the Pantry" subtitle="Everyday essentials, milled and packed the traditional way." />
        </Reveal>

        {/* Mobile: swipeable rail. Tablet: 2 columns with a wide first tile.
            Desktop (lg): the generated 12-column composition. */}
        <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:auto-rows-[92px] lg:grid-cols-12">
          {tiles.map(({ category, count, cover }, i) => {
            const pl = places[i];
            const isFeature = pl.rows === 4 && pl.cols >= 6;
            const isWide = !isFeature && pl.cols >= 6;
            const title = isFeature
              ? "text-[28px] lg:text-[38px]"
              : isWide
              ? "text-[22px] lg:text-[28px]"
              : "text-[22px] lg:text-[24px]";
            // Tablet: the first tile, and a lone last tile, span both columns.
            const tabletWide = i === 0 || (i === n - 1 && (n - 1) % 2 === 1);
            return (
              <Reveal
                key={category.id}
                delay={i * 60}
                className={`group relative aspect-[5/6] flex-shrink-0 snap-start overflow-hidden bg-cream-2 ${
                  i === 0 ? "w-[72vw]" : "w-[62vw]"
                } md:w-auto ${tabletWide ? "md:col-span-2 md:aspect-[16/8]" : "md:aspect-[4/3]"} lg:aspect-auto ${COLS[pl.cols]} ${ROWS[pl.rows]}`}
              >
                <Link href={`/collections/${category.id}`} className="absolute inset-0 block" aria-label={`${category.name}, ${count} products`}>
                  {cover ? (
                    <ProductImage
                      productId={cover.id}
                      categoryId={category.id}
                      alt=""
                      className="h-full w-full transition-transform duration-editorial ease-brand md:group-hover:scale-[1.05]"
                      iconSize="text-5xl"
                      imageUrl={getGalleryUrls(cover)[0] ?? null}
                    />
                  ) : (
                    <div className="h-full w-full bg-cream-2" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/5 to-transparent transition-opacity duration-base md:opacity-90 md:group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 md:p-5">
                    <div className="transition-transform duration-base ease-brand md:group-hover:-translate-y-1">
                      <div className={`font-serif font-semibold leading-none tracking-tight text-warm ${title}`}>
                        {category.name}
                      </div>
                      <div className="mt-1.5 text-[11px] text-warm/75">
                        {count} product{count === 1 ? "" : "s"}
                      </div>
                    </div>
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-warm/95 text-ink">
                      <i className="ti ti-arrow-right text-[16px] transition-transform duration-base ease-brand md:group-hover:-rotate-45" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
