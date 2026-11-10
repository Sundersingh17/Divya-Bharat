"use client";

import Link from "next/link";
import ProductImage, { getGalleryUrls } from "@/components/ProductImage";
import { Product } from "@/lib/types";
import { priceLabel } from "@/lib/pantry";
import Pack3D from "./Pack3D";

// One pack on a shelf: real product photo, name and price as HTML text.
// This is an image plate, not a transparent cut-out or a 3D model.
export default function PantryPlate({
  product,
  tabIndex,
  part = "both",
  three
}: {
  product: Product;
  tabIndex?: number;
  /** "image"/"label" render one half, so a shelf plank can sit between them. */
  part?: "both" | "image" | "label";
  /** Render the pack as a 3D object of this pixel width instead of a flat photo. */
  three?: { size: number; index: number };
}) {
  const urls = three ? getGalleryUrls(product) : [];
  const showImage = part !== "label";
  const showLabel = part !== "image";
  return (
    <Link
      href={`/product/${product.id}`}
      tabIndex={tabIndex}
      aria-hidden={part === "image" ? true : undefined}
      className="pantry-plate group block text-center"
    >
      {showImage && three && (
        <span className="relative mx-auto block" style={{ width: three.size, perspective: 900 }}>
          <Pack3D frontUrl={urls[0] ?? null} backUrl={urls[1] ?? null} size={three.size} sway swayDelay={-(three.index * 1.3)} />
          <span className="pantry-shadow" aria-hidden="true" />
        </span>
      )}
      {showImage && !three && (
      <span className="pantry-plate-img block aspect-square w-full overflow-hidden bg-cream-2">
        <ProductImage
          productId={product.id}
          categoryId={product.category_id}
          alt={product.name}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          iconSize="text-3xl"
          imageUrl={getGalleryUrls(product)[0] ?? null}
          thumb
        />
      </span>
      )}
      {showLabel && (
        <>
      <span className="mt-2.5 block text-[12.5px] font-semibold leading-snug text-ink group-hover:text-red-dark md:text-[13.5px]">
        {product.name}
      </span>
      <span className="block text-[11.5px] tabular-nums text-ink-soft md:text-[12.5px]">{priceLabel(product)}</span>
        </>
      )}
    </Link>
  );
}
