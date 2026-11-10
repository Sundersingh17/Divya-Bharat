import { Product } from "./types";

// "What a customer actually pays" for a product right now — an active
// daily offer price wins over the ticketed variant price. Falls back to
// the legacy base product.price column for a product with no variant
// rows yet, matching the fallback ProductCard/ProductDetailClient use.
// A product can have several pack sizes at different prices, so this
// returns a range rather than a single number.
export function effectivePriceRange(product: Product): { min: number; max: number } {
  const variants = product.variants && product.variants.length > 0 ? product.variants : null;
  if (!variants) return { min: product.price, max: product.price };
  const prices = variants.map((v) => v.offer_price ?? v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function productPackSizes(product: Product): string[] {
  const variants = product.variants && product.variants.length > 0 ? product.variants : null;
  if (!variants) return product.pack_size ? [product.pack_size] : [];
  return variants.map((v) => v.pack_size);
}

export function productInStock(product: Product): boolean {
  const variants = product.variants && product.variants.length > 0 ? product.variants : null;
  if (!variants) return product.stock_qty > 0;
  return variants.some((v) => v.stock_qty > 0);
}
