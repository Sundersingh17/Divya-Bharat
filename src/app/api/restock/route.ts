import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimitShared, getClientKey } from "@/lib/rateLimit";
import { isNonEmptyString } from "@/lib/validate";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";

export async function POST(req: NextRequest) {
  if (!(await rateLimitShared(`restock:${getClientKey(req)}`, 6, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { variantId, email } = body ?? {};
  if (!isNonEmptyString(variantId, 150)) return NextResponse.json({ error: "Missing pack size." }, { status: 400 });
  if (typeof email !== "string" || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const { data: variant } = await supabaseAdmin
    .from("product_variants")
    .select("id, product_id, stock_qty")
    .eq("id", variantId)
    .maybeSingle();
  if (!variant) return NextResponse.json({ error: "Pack size not found." }, { status: 404 });
  // Only genuinely unavailable sizes can be waited on.
  if (variant.stock_qty > 0) {
    return NextResponse.json({ error: "This size is in stock right now." }, { status: 409 });
  }

  const userId = await getUserIdFromRequest(req);
  const { error } = await supabaseAdmin.from("restock_requests").upsert(
    { product_id: variant.product_id, variant_id: variant.id, email: email.trim().toLowerCase(), user_id: userId, notified_at: null },
    { onConflict: "variant_id,email" }
  );
  if (error) {
    console.error("Restock request failed", error);
    return NextResponse.json({ error: "Could not save your request. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
