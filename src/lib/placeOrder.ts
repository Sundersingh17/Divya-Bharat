import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeText } from "@/lib/validate";
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from "@/lib/email";
import { recordCouponUsage } from "@/lib/recordCouponUsage";
import { earnPoints, redeemPoints } from "@/lib/loyaltyLedger";
import { PricingError, type OrderQuote } from "@/lib/serverPricing";
import { reserveStock, releaseStock, checkLowStock } from "@/lib/stock";
import { revalidateStorefront } from "@/lib/revalidateStore";
import { logEvent } from "@/lib/events";

function generateOrderId() {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DB${stamp}${rand}`;
}

export type PlaceOrderInput = {
  userId: string;
  customerName: string;
  phone: string;
  email?: string | null;
  address: string;
  quote: OrderQuote;
  paymentMethod: "COD" | "Razorpay";
  razorpay?: { orderId: string; paymentId: string };
};

/** Writes an order from a SERVER-computed quote. Prices, totals and
 * discounts never come from the browser. */
export async function placeOrder(input: PlaceOrderInput): Promise<{ orderId: string; pointsRedeemed: number }> {
  const { userId, quote, paymentMethod } = input;
  const orderId = generateOrderId();
  const name = sanitizeText(input.customerName);
  const address = sanitizeText(input.address);
  const email = input.email ? sanitizeText(input.email) : null;
  const phone = input.phone.trim();

  // Take the stock atomically first, so the last unit can't be sold twice.
  const stockLines = quote.lines.map((l) => ({ variantId: l.variantId, qty: l.qty }));
  const stock = await reserveStock(stockLines);
  if (!stock.ok) {
    throw new PricingError("Sorry, an item just sold out. Please review your cart.", 409);
  }
  const reserved = stock.configured;

  const { error: orderError } = await supabaseAdmin.from("orders").insert({
    id: orderId,
    user_id: userId,
    customer_name: name,
    email,
    phone,
    address,
    subtotal: quote.subtotal,
    shipping_fee: quote.shipping,
    total: quote.total,
    coupon_code: quote.couponCode,
    discount_amount: quote.couponDiscount,
    payment_method: paymentMethod,
    payment_status: paymentMethod === "Razorpay" ? "paid" : "pending",
    ...(input.razorpay
      ? { razorpay_order_id: input.razorpay.orderId, razorpay_payment_id: input.razorpay.paymentId }
      : {}),
    status: "Placed",
    ...(reserved ? { stock_reserved: true } : {})
  });
  if (orderError) {
    if (reserved) await releaseStock(stockLines);
    await logEvent("order_failed", { stage: "orders.insert", message: orderError.message, paymentMethod });
    throw orderError;
  }

  const orderItems = quote.lines.map((l) => ({
    order_id: orderId,
    product_id: l.productId,
    variant_id: l.variantId,
    pack_size: l.packSize,
    product_name: l.name,
    product_name_odia: l.nameOdia,
    qty: l.qty,
    price: l.price
  }));
  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);
  if (itemsError) {
    // Don't leave an order with no items behind (order_items cascade on delete).
    await supabaseAdmin.from("orders").delete().eq("id", orderId);
    if (reserved) await releaseStock(stockLines);
    await logEvent("order_failed", { stage: "order_items.insert", message: itemsError.message, orderId });
    throw itemsError;
  }

  await supabaseAdmin.from("order_status_history").insert({ order_id: orderId, status: "Placed" });
  await recordCouponUsage(quote.couponCode);

  let pointsRedeemed = 0;
  if (quote.pointsToRedeem > 0) {
    pointsRedeemed = await redeemPoints(userId, orderId, quote.pointsToRedeem, quote.subtotal);
  }
  await earnPoints(userId, orderId, quote.total);

  if (email) {
    try {
      await supabaseAdmin
        .from("cart_snapshots")
        .update({ converted: true })
        .eq("email", email.toLowerCase())
        .eq("converted", false);
    } catch (err) {
      console.error("Failed to mark cart snapshot converted", err);
    }
  }

  const emailItems = orderItems.map((i) => ({ product_name: i.product_name, qty: i.qty, price: i.price }));
  if (email) {
    sendOrderConfirmationEmail({ to: email, orderId, customerName: name, items: emailItems, total: quote.total, paymentMethod });
  }
  sendAdminNewOrderEmail({ orderId, customerName: name, phone, email, address, items: emailItems, total: quote.total, paymentMethod });

  if (reserved) {
    checkLowStock(stockLines.map((l) => l.variantId));
    revalidateStorefront(); // public pages show the reduced stock right away
  }

  return { orderId, pointsRedeemed };
}

/** Parses and validates the customer-detail part of an order request. */
export function parseCustomer(body: any): { ok: true; name: string; phone: string; email: string | null; address: string } | { ok: false; error: string } {
  const { customerName, phone, email, address } = body ?? {};
  if (typeof customerName !== "string" || !customerName.trim() || customerName.length > 200) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (typeof phone !== "string" || !/^[0-9]{10}$/.test(phone.trim())) {
    return { ok: false, error: "Please enter a valid 10-digit phone number." };
  }
  if (email && (typeof email !== "string" || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (typeof address !== "string" || !address.trim() || address.length > 500) {
    return { ok: false, error: "Please enter a delivery address." };
  }
  return { ok: true, name: customerName, phone: phone.trim(), email: email || null, address };
}
