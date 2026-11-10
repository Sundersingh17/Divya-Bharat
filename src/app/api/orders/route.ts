import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidPhone, isNonEmptyString } from "@/lib/validate";
import { rateLimitShared, getClientKey } from "@/lib/rateLimit";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { quoteOrder, totalsDiffer, PricingError } from "@/lib/serverPricing";
import { placeOrder, parseCustomer } from "@/lib/placeOrder";

// Cash-on-delivery order placement. Prices/discounts/shipping are
// recomputed server-side; the browser's totals are only a sanity check.
export async function POST(req: NextRequest) {
  if (!(await rateLimitShared(`orders-create:${getClientKey(req)}`, 8, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Please sign in before placing an order." }, { status: 401 });
    }

    const body = await req.json();
    const customer = parseCustomer(body);
    if (!customer.ok) return NextResponse.json({ error: customer.error }, { status: 400 });
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
      return NextResponse.json({ error: "Your cart looks invalid. Please refresh and try again." }, { status: 400 });
    }

    const quote = await quoteOrder({
      userId,
      items: body.items.map((i: any) => ({ productId: String(i?.productId ?? ""), variantId: i?.variantId, qty: i?.qty })),
      couponCode: typeof body.couponCode === "string" ? body.couponCode : null,
      redeemPoints: typeof body.redeemedPoints === "number" ? body.redeemedPoints : 0
    });

    if (totalsDiffer(body.total, quote.total)) {
      return NextResponse.json(
        { error: `Prices or discounts changed. Your updated total is ₹${quote.total}. Please review and try again.`, serverTotal: quote.total },
        { status: 409 }
      );
    }

    // Duplicate-submit guard: same customer, same total, COD, within 30s.
    const since = new Date(Date.now() - 30_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", userId)
      .eq("payment_method", "COD")
      .eq("total", quote.total)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (recent) return NextResponse.json({ orderId: recent.id, pointsRedeemed: 0, duplicate: true }, { status: 200 });

    const result = await placeOrder({
      userId,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      quote,
      paymentMethod: "COD"
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof PricingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Order creation failed", err);
    return NextResponse.json({ error: "Could not place order. Please try again." }, { status: 500 });
  }
}

function maskAddress(address: string) {
  // Guests see only enough to recognise the order, not the full address.
  return address.length <= 12 ? "••••" : `••••${address.slice(-12)}`;
}

// Order lookup.
//  - Signed in: all of the caller's own orders (matched by user_id, never by phone alone).
//  - Guest (legacy orders): must supply BOTH order id and the phone number on it;
//    returns only that order with a masked address.
export async function GET(req: NextRequest) {
  if (!(await rateLimitShared(`orders-lookup:${getClientKey(req)}`, 10, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const select = "*, order_items(*), order_status_history(status, changed_at)";
  const userId = await getUserIdFromRequest(req);
  if (userId) {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(select)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
    return NextResponse.json({ orders: data });
  }

  const phone = req.nextUrl.searchParams.get("phone");
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!isValidPhone(phone) || !isNonEmptyString(orderId, 40)) {
    return NextResponse.json({ error: "Please enter your order ID and the phone number used on the order." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(select)
    .eq("id", orderId.trim().toUpperCase())
    .eq("phone", phone.trim())
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  if (!data) return NextResponse.json({ orders: [] });
  return NextResponse.json({ orders: [{ ...data, address: maskAddress(data.address), email: null }] });
}
