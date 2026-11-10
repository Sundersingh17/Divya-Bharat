import { Category, Product, ProductVariant } from "./types";
import { getGalleryUrls } from "@/components/ProductImage";
import { effectivePriceRange } from "./pricing";

// Pantry sections follow the real category table. This order only decides
// which shelf comes first; any category not listed is appended after, and a
// category with no live products simply has no shelf. Nothing is hard-coded
// about products themselves.
export const PANTRY_ORDER = ["oils", "flours", "chhatua", "spices", "dal", "papad", "other", "bundles"];

export type PantrySection = { category: Category; products: Product[] };

export function buildPantrySections(categories: Category[], products: Product[], perShelf: number): PantrySection[] {
  const rank = (id: string) => {
    const i = PANTRY_ORDER.indexOf(id);
    return i === -1 ? PANTRY_ORDER.length : i;
  };
  const stocked = (p: Product) =>
    p.variants && p.variants.length > 0 ? p.variants.some((v) => v.stock_qty > 0) : p.stock_qty > 0;
  return [...categories]
    .sort((a, b) => rank(a.id) - rank(b.id))
    .map((category) => {
      const list = products
        .filter((p) => p.category_id === category.id)
        .sort((a, b) => {
          const img = Number(getGalleryUrls(b).length > 0) - Number(getGalleryUrls(a).length > 0);
          return img || Number(stocked(b)) - Number(stocked(a));
        })
        .slice(0, perShelf);
      return { category, products: list };
    })
    .filter((s) => s.products.length > 0);
}

export function priceLabel(p: Product) {
  const { min, max } = effectivePriceRange(p);
  return min === max ? `₹${min}` : `from ₹${min}`;
}

/** Variants to show for a product, with the same fallback the product page uses. */
export function variantsOf(p: Product): ProductVariant[] {
  return p.variants && p.variants.length > 0
    ? p.variants
    : [{ id: `${p.id}-default`, product_id: p.id, pack_size: p.pack_size, price: p.price, mrp: p.mrp, stock_qty: p.stock_qty, is_default: true, sort_order: 0 }];
}

export function defaultVariantOf(p: Product): ProductVariant {
  const vs = variantsOf(p);
  return vs.find((v) => v.offer_price != null) ?? vs.find((v) => v.is_default) ?? vs[0];
}
