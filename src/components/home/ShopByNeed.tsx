"use client";

import Link from "next/link";
import { LandingPage } from "@/lib/landingPages";
import { Product } from "@/lib/types";
import ProductImage, { getGalleryUrls } from "../ProductImage";
import { Container, Reveal, SectionHeading } from "../ui";
import { composeNeeds } from "./compose";

// Full class names so Tailwind can see them.
const COLS: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  4: "lg:col-span-4"
};
const ROWS: Record<number, string> = { 1: "lg:row-span-1", 2: "lg:row-span-2" };

// Cards come straight from the use-case CMS (/use-case/[slug]): cover
// image first, then the first linked product's photo, then a leaf-green
// block. The desktop composition is GENERATED from the item count (see
// compose.ts), so 3 items look as intentional as 6 and nothing is left
// with an empty cell.
export default function ShopByNeed({ pages, products }: { pages: LandingPage[]; products: Product[] }) {
  if (pages.length === 0) return null;
  const byId = new Map(products.map((p) => [p.id, p]));
  const n = pages.length;
  const places = composeNeeds(n);
  // 4+ items: a swipeable rail on phones. Fewer: compact stacked cards.
  const rail = n >= 4;

  return (
    <section className="section-pad bg-sand">
      <Container>
        <Reveal>
          <SectionHeading
            variant="editorial"
            eyebrow="Find your fit"
            title="Shop by Need"
            subtitle="The right pantry pick for how you actually cook and eat."
            action={
              <Link href="/use-case" className="hidden whitespace-nowrap text-[12px] font-semibold uppercase tracking-[.08em] text-red hover:text-red-dark md:block">
                View all →
              </Link>
            }
          />
        </Reveal>

        <div
          className={
            rail
              ? "scrollbar-none -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:auto-rows-[176px] lg:grid-cols-4"
              : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:auto-rows-[176px] lg:grid-cols-4"
          }
        >
          {pages.map((p, i) => {
            const pl = places[i];
            const linked = p.product_ids.map((id) => byId.get(id)).find(Boolean);
            const photo = linked ? getGalleryUrls(linked)[0] ?? null : null;
            const large = pl.cols === 2 && pl.rows === 2;
            const small = pl.cols === 1;
            const title = large
              ? "text-[24px] lg:text-[36px]"
              : small
              ? "text-[20px] lg:text-[21px]"
              : "text-[22px] lg:text-[26px]";
            // Two-column (sm) view: a lone last tile spans the row.
            const loneLast = n % 2 === 1 && i === n - 1;
            return (
              <Reveal
                key={p.id}
                delay={(i % 3) * 60}
                className={`group relative overflow-hidden bg-cream-2 ${
                  rail ? "aspect-[5/6] w-[72vw] flex-shrink-0 snap-start sm:aspect-[4/3] sm:w-auto" : "aspect-[16/10] sm:aspect-[4/3]"
                } ${loneLast ? "sm:col-span-2" : ""} lg:aspect-auto ${COLS[pl.cols]} ${ROWS[pl.rows]}`}
              >
                <Link href={`/use-case/${p.id}`} className="absolute inset-0 block" aria-label={p.title}>
                  <div className="absolute inset-0">
                    {p.cover_image_url ? (
                      <img
                        src={p.cover_image_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-editorial ease-brand md:group-hover:scale-[1.05]"
                      />
                    ) : linked ? (
                      <ProductImage
                        productId={linked.id}
                        categoryId={linked.category_id}
                        alt=""
                        className="h-full w-full transition-transform duration-editorial ease-brand md:group-hover:scale-[1.05]"
                        iconSize="text-5xl"
                        imageUrl={photo}
                      />
                    ) : (
                      <div className="h-full w-full bg-leaf" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-5">
                    <div className="min-w-0 transition-transform duration-base ease-brand md:group-hover:-translate-y-1">
                      <h3 className={`font-serif font-semibold leading-[1.08] tracking-tight text-warm ${title}`}>
                        {p.title}
                      </h3>
                      {p.subtitle && (
                        <p className={`mt-1.5 line-clamp-2 max-w-sm text-[12px] leading-relaxed text-warm/75 ${small ? "lg:hidden" : ""}`}>
                          {p.subtitle}
                        </p>
                      )}
                    </div>
                    <i className="ti ti-arrow-up-right flex-shrink-0 text-[20px] text-warm transition-transform duration-base ease-brand md:group-hover:-translate-y-1 md:group-hover:translate-x-1" aria-hidden="true" />
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
