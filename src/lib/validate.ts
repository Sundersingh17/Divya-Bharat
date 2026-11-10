// Lightweight, dependency-free validation for API route inputs.
// For a larger app, swap this for a schema library like zod — this is
// intentionally minimal so the MVP has no extra dependencies.

export function isValidPhone(phone: unknown): phone is string {
  return typeof phone === "string" && /^[0-9]{10}$/.test(phone.trim());
}

export function isNonEmptyString(value: unknown, maxLen = 500): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLen;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && isFinite(value) && value >= 0;
}

export function sanitizeText(value: string): string {
  // Strips characters with no legitimate use in a name/address field and
  // caps length as a defensive measure against abuse, not a full sanitizer.
  return value.replace(/[<>]/g, "").trim().slice(0, 500);
}

export type CartItemInput = {
  productId: string;
  variantId?: string;
  packSize?: string;
  name: string;
  nameOdia: string;
  price: number;
  qty: number;
};

export function isValidCartItem(item: any): item is CartItemInput {
  return (
    item &&
    isNonEmptyString(item.productId, 100) &&
    (item.variantId === undefined || isNonEmptyString(item.variantId, 150)) &&
    (item.packSize === undefined || typeof item.packSize === "string") &&
    isNonEmptyString(item.name, 200) &&
    typeof item.nameOdia === "string" &&
    isPositiveNumber(item.price) &&
    typeof item.qty === "number" &&
    Number.isInteger(item.qty) &&
    item.qty > 0 &&
    item.qty <= 50
  );
}
