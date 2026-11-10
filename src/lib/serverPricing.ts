import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateCoupon } from "@/lib/coupons";
import { MEMBERSHIP_DISCOUNT_PCT } from "@/lib/membership";
import { maxRedeemablePoints, RUPEES_PER_POINT_REDEEMED } from "@/lib/loyalty";
import { getLoyaltyBalance } from "@/lib/loyaltyLedger";
import { FREE_SHIP_THRESHOLD, SHIPPING_FEE, MAX_LINE_QTY } from "@/lib/shipping";

// Authoritative order pricing. The browser only says WHAT it wants
// (variant + quantity, optional coupon, points to use). Every price,
// discount, delivery fee and total is recomputed here from the database.

export class PricingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type RequestedItem = { productId: string; variantId?: string; qty: number };

export type PricedLine = {
  productId: string;
  variantId: string;
  packSize: string;
  name: string;
  nameOdia: string;
  price: number;
  qty: number;
};

export type OrderQuote = {
  lines: PricedLine[];
  subtotal: number;
  isMember: boolean;
  clubDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  pointsToRedeem: number;
  pointsDiscount: number;
  shipping: number;
  total: number;
};

export async function isActiveMember(userId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .gte("end_date", today)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function quoteOrder(params: {
  userId: string;
  items: RequestedItem[];
  couponCode?: string | null;
  redeemPoints?: number;
}): Promise<OrderQuote> {
  const { userId, items } = params;
  if (!Array.isArray(items) || items.length === 0) throw new PricingError("Your cart is empty.");

  // Merge duplicate lines and validate quantities.
  const wanted = new Map<string, RequestedItem>();
  for (const it of items) {
    if (!it || typeof it.productId !== "string" || !Number.isInteger(it.qty) || it.qty <= 0) {
      throw new PricingError("Your cart looks invalid. Please refresh and try again.");
    }
    const key = it.variantId || `${it.productId}-default`;
    const existing = wanted.get(key);
    const qty = (existing?.qty ?? 0) + it.qty;
    if (qty > MAX_LINE_QTY) throw new PricingError(`You can order at most ${MAX_LINE_QTY} of one item.`);
    wanted.set(key, { productId: it.productId, variantId: key, qty });
  }

  // Old carts used productId as the variant id; fall back to the seeded "-default" variant.
  const lookupIds = new Set<string>();
  wanted.forEach((w, key) => {
    lookupIds.add(key);
    lookupIds.add(`${w.productId}-default`);
  });
  const productIds = Array.from(new Set(Array.from(wanted.values()).map((w) => w.productId)));

  const [{ data: variants }, { data: products }, { data: offers }] = await Promise.all([
    supabaseAdmin.from("product_variants").select("*").in("id", Array.from(lookupIds)),
    supabaseAdmin.from("products").select("id, name, name_odia, is_active, price, pack_size, stock_qty").in("id", productIds),
    supabaseAdmin.from("daily_offers").select("variant_id, offer_price").eq("active", true)
  ]);

  const variantById = new Map((variants ?? []).map((v: any) => [v.id, v]));
  const productById = new Map((products ?? []).map((p: any) => [p.id, p]));
  const offerByVariant = new Map((offers ?? []).map((o: any) => [o.variant_id, Number(o.offer_price)]));

  const lines: PricedLine[] = [];
  wanted.forEach((w, key) => {
    const product: any = productById.get(w.productId);
    if (!product || !product.is_active) {
      throw new PricingError("An item in your cart is no longer available. Please review your cart.", 409);
    }
    let variant: any = variantById.get(key);
    if (!variant) variant = variantById.get(`${w.productId}-default`);
    if (!variant || variant.product_id !== w.productId) {
      throw new PricingError(`${product.name} is no longer available in that pack size.`, 409);
    }
    if (Number(variant.stock_qty) < w.qty) {
      throw new PricingError(
        variant.stock_qty <= 0
          ? `${product.name} (${variant.pack_size}) is out of stock.`
          : `Only ${variant.stock_qty} of ${product.name} (${variant.pack_size}) left.`,
        409
      );
    }
    const price = offerByVariant.get(variant.id) ?? Number(variant.price);
    if (!isFinite(price) || price < 0) throw new PricingError("Pricing error. Please try again later.", 500);
    lines.push({
      productId: product.id,
      variantId: variant.id,
      packSize: variant.pack_size,
      name: product.name,
      nameOdia: product.name_odia ?? "",
      price,
      qty: w.qty
    });
  });

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const isMember = await isActiveMember(userId);
  const clubDiscount = isMember ? Math.round(subtotal * (MEMBERSHIP_DISCOUNT_PCT / 100)) : 0;

  let couponCode: string | null = null;
  let couponDiscount = 0;
  let couponFreeShipping = false;
  if (params.couponCode) {
    const result = await validateCoupon(params.couponCode, subtotal);
    if (!result.ok) throw new PricingError(result.error, 400);
    couponCode = result.code;
    couponDiscount = result.discount;
    couponFreeShipping = result.freeShipping;
  }

  let pointsToRedeem = 0;
  if (typeof params.redeemPoints === "number" && params.redeemPoints > 0) {
    const balance = await getLoyaltyBalance(userId);
    pointsToRedeem = Math.min(Math.floor(params.redeemPoints), maxRedeemablePoints(subtotal, balance));
  }
  const pointsDiscount = pointsToRedeem * RUPEES_PER_POINT_REDEEMED;

  const shipping = isMember || couponFreeShipping || subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = Math.max(0, subtotal - clubDiscount - couponDiscount - pointsDiscount + shipping);

  return { lines, subtotal, isMember, clubDiscount, couponCode, couponDiscount, pointsToRedeem, pointsDiscount, shipping, total };
}

/** Client-sent totals are only a sanity check against what the customer saw. */
export function totalsDiffer(clientTotal: unknown, serverTotal: number): boolean {
  return typeof clientTotal !== "number" || Math.abs(clientTotal - serverTotal) > 1;
}
