"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductImage, { resolveVariantGallery } from "./ProductImage";

type GalleryImage = { storage_path: string; variant_id?: string | null; view?: string | null; sort_order?: number };

// Pack-size aware gallery. Shows the selected variant's own photos (front,
// then back) when they exist; otherwise falls back to the product's primary
// photos (see resolveVariantGallery) and says so, so a shopper is never
// told a photo is the exact pack they picked when it is not.
export default function ProductGallery({
  product,
  categoryId,
  alt,
  variantId,
  packSize
}: {
  product: { id: string; images?: GalleryImage[]; variants?: { id: string; is_default?: boolean }[] };
  categoryId: string;
  alt: string;
  variantId?: string;
  packSize?: string;
}) {
  const { urls, exact } = useMemo(() => resolveVariantGallery(product, variantId), [product, variantId]);

  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => setActiveIdx(0), [variantId]);
  const activeUrl = urls[activeIdx] ?? null;

  // Swipe left/right on the main photo to move between front and back.
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null || urls.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    setActiveIdx((i) => (dx < 0 ? Math.min(urls.length - 1, i + 1) : Math.max(0, i - 1)));
  };

  return (
    <div>
      <div
        className="relative aspect-square w-full overflow-hidden bg-cream-2"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* keyed by photo so each change fades in instead of snapping */}
        <div key={activeUrl ?? "none"} className="gallery-fade h-full w-full">
          <ProductImage
            productId={product.id}
            categoryId={categoryId}
            alt={alt}
            className="h-full w-full"
            iconSize="text-7xl"
            imageUrl={activeUrl}
            priority
          />
        </div>
        {urls.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
            {urls.map((u, i) => (
              <span key={u + i} className={`h-1.5 rounded-full transition-all ${i === activeIdx ? "w-5 bg-ink" : "w-1.5 bg-ink/30"}`} />
            ))}
          </div>
        )}
      </div>
      {!exact && urls.length > 0 && packSize && (
        <p className="mt-2 text-[11.5px] text-ink-soft">Photo shows our standard pack — your {packSize} pack is the same product.</p>
      )}

      {urls.length > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={url + i}
              onClick={() => setActiveIdx(i)}
              aria-label={`Show image ${i + 1}`}
              aria-pressed={activeIdx === i}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden border-2 transition-colors ${
                activeIdx === i ? "border-red" : "border-line hover:border-gold"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${alt} view ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
