// Shared by the storefront and the server. A pack with stock at or below this
// number (and above 0) is "running low". Set NEXT_PUBLIC_LOW_STOCK_THRESHOLD
// to change it everywhere; the server also honours LOW_STOCK_THRESHOLD.
export const LOW_STOCK_LEVEL = Number(process.env.NEXT_PUBLIC_LOW_STOCK_THRESHOLD ?? 10);

export function isLowStock(qty: number) {
  return qty > 0 && qty <= LOW_STOCK_LEVEL;
}
