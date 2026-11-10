import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { isNonEmptyString, sanitizeText } from "@/lib/validate";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!isNonEmptyString(productId, 100)) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ reviews: data });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`reviews-post:${getClientKey(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Please sign in to leave a review." }, { status: 401 });
  }

  const { productId, rating, reviewText } = await req.json();

  if (!isNonEmptyString(productId, 100)) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be a whole number from 1 to 5." }, { status: 400 });
  }
  if (reviewText && (typeof reviewText !== "string" || reviewText.length > 1000)) {
    return NextResponse.json({ error: "Review text is too long." }, { status: 400 });
  }

  // Verified-purchase check happens here, server-side, so it can't be
  // spoofed by the client — look for a Delivered order containing this
  // product, placed by this user.
  const { data: deliveredItems } = await supabaseAdmin
    .from("order_items")
    .select("order_id, orders!inner(user_id, status)")
    .eq("product_id", productId)
    .eq("orders.user_id", userId)
    .eq("orders.status", "Delivered")
    .limit(1);

  const isVerifiedPurchase = (deliveredItems?.length ?? 0) > 0;

  const { error } = await supabaseAdmin.from("reviews").upsert(
    {
      product_id: productId,
      user_id: userId,
      rating,
      review_text: reviewText ? sanitizeText(reviewText) : null,
      is_verified_purchase: isVerifiedPurchase
    },
    { onConflict: "product_id,user_id" }
  );

  if (error) {
    console.error("Failed to save review", error);
    return NextResponse.json({ error: "Could not save your review. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, isVerifiedPurchase }, { status: 201 });
}
