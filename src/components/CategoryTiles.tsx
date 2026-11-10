"use client";

import Link from "next/link";
import { Category, Product } from "@/lib/types";
import ProductImage, { getGalleryUrls } from "./ProductImage";

// Visual category navigation for the Shop page: a round product photo per
// category, scrollable on mobile and wrapping on desktop. Each tile links to
// the category's own page. Categories with no products are left out.
export default function CategoryTiles({ categories, products }: { categories: Category[]; products: Product[] }) {
  const tiles = categories
    .map((c) => {
      const inCat = products.filter((p) => p.category_id === c.id);
      const cover = inCat.find((p) => getGalleryUrls(p).length > 0) ?? inCat[0];
      return { c, count: inCat.length, cover };
    })
    .filter((t) => t.count > 0);

  if (tiles.length === 0) return null;

  return (
    <nav aria-label="Shop by category" className="scrollbar-none -mx-5 mb-10 flex gap-5 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:gap-7 md:px-0">
      {tiles.map(({ c, count, cover }) => (
        <Link
          key={c.id}
          href={`/collections/${c.id}`}
          className="group flex w-[84px] flex-shrink-0 flex-col items-center text-center md:w-[104px]"
        >
          <span className="relative block h-[76px] w-[76px] overflow-hidden rounded-full border border-line bg-cream-2 ring-0 ring-gold/60 transition-all duration-300 group-hover:ring-2 md:h-[96px] md:w-[96px]">
            {cover && (
              <ProductImage
                productId={cover.id}
                categoryId={c.id}
                alt=""
                className="h-full w-full transition-transform duration-500 group-hover:scale-110"
                iconSize="text-2xl"
                imageUrl={getGalleryUrls(cover)[0] ?? null}
                thumb
              />
            )}
          </span>
          <span className="mt-2.5 text-[12.5px] font-semibold leading-tight text-ink group-hover:text-red-dark md:text-[13.5px]">{c.name}</span>
          <span className="mt-0.5 text-[11px] text-ink-soft">{count} item{count === 1 ? "" : "s"}</span>
        </Link>
      ))}
    </nav>
  );
}
