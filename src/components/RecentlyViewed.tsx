"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductImage from "./ProductImage";
import { Container } from "./ui";
import { getRecent, RecentItem } from "@/lib/recentlyViewed";

// Strip of products this visitor looked at before (current one excluded).
// Reads localStorage after mount, so it renders nothing on the server.
export default function RecentlyViewed({ currentId }: { currentId: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setItems(getRecent().filter((r) => r.id !== currentId));
  }, [currentId]);

  if (items.length === 0) return null;

  return (
    <section className="section-pad border-t border-line" aria-label="Recently viewed">
      <Container>
        <h2 className="mb-6 font-serif text-[24px] font-semibold text-ink md:text-[28px]">Recently viewed</h2>
        <div className="scrollbar-none -mx-5 flex gap-4 overflow-x-auto px-5 md:mx-0 md:px-0">
          {items.map((r) => (
            <Link key={r.id} href={`/product/${r.id}`} className="group w-[132px] flex-shrink-0 md:w-[168px]">
              <div className="aspect-square overflow-hidden bg-cream-2">
                <ProductImage
                  productId={r.id}
                  categoryId={r.categoryId}
                  alt=""
                  className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                  iconSize="text-3xl"
                  imageUrl={r.imageUrl}
                  thumb
                />
              </div>
              <div className="mt-2 text-[13px] font-semibold leading-snug text-ink group-hover:text-red-dark">{r.name}</div>
              <div className="text-[12px] tabular-nums text-ink-soft">₹{r.price}</div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
