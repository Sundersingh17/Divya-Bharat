"use client";

import { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
import { EmptyState } from "./ui";

function SkeletonCard() {
  const shimmer =
    "bg-gradient-to-r from-cream-2 via-[#F7F2E9] to-cream-2 bg-[length:640px_100%] animate-shimmer";
  return (
    <div>
      <div className={`aspect-[4/5] w-full ${shimmer}`} />
      <div className="pt-4">
        <div className={`mb-2 h-3 w-4/5 ${shimmer}`} />
        <div className={`mb-2 h-3 w-2/5 ${shimmer}`} />
        <div className={`h-3 w-1/3 ${shimmer}`} />
      </div>
    </div>
  );
}

const GRID = "grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-7 lg:grid-cols-4";

export default function ProductGrid({
  products,
  loading
}: {
  products: Product[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState title="Nothing matches that, yet." text="Try a different name, or clear your filters." />
    );
  }

  return (
    <div className={GRID}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} />
      ))}
    </div>
  );
}
