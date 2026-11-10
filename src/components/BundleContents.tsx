"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ProductImage from "./ProductImage";

type BundleItemRow = {
  qty: number;
  products: { id: string; name: string; name_odia: string; price: number; category_id: string } | null;
};

export default function BundleContents({ bundleId, bundlePrice }: { bundleId: string; bundlePrice: number }) {
  const [items, setItems] = useState<BundleItemRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("bundle_items")
      .select("qty, products(id, name, name_odia, price, category_id)")
      .eq("bundle_id", bundleId)
      .then(({ data }) => setItems((data as any) ?? []));
  }, [bundleId]);

  if (!items || items.length === 0) return null;

  const individualTotal = items.reduce((sum, i) => sum + (i.products?.price ?? 0) * i.qty, 0);
  const savings = individualTotal - bundlePrice;

  return (
    <div className="mb-6 border border-line rounded-xl overflow-hidden">
      <div className="bg-cream px-4 py-3 text-[13px] font-semibold text-ink">What's included</div>
      <div className="divide-y divide-line">
        {items.map(
          (item) =>
            item.products && (
              <Link
                key={item.products.id}
                href={`/product/${item.products.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-cream/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream-2 flex-shrink-0">
                  <ProductImage
                    productId={item.products.id}
                    categoryId={item.products.category_id}
                    alt={item.products.name}
                    className="w-full h-full"
                    iconSize="text-base"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{item.products.name}</div>
                  <div className="text-[11px] text-ink-soft">{item.products.name_odia}</div>
                </div>
                <div className="text-[12.5px] tabular-nums text-ink-soft">₹{item.products.price}</div>
              </Link>
            )
        )}
      </div>
      {savings > 0 && (
        <div className="bg-[#EBF0E4] px-4 py-2.5 text-[12px] text-sage font-semibold">
          Buying separately: ₹{individualTotal} — you save ₹{savings} with this kit
        </div>
      )}
    </div>
  );
}
