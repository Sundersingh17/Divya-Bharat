import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString, isPositiveNumber } from "@/lib/validate";

// Returns every offer (active or not) with the product name / pack size /
// current price joined in, so the admin list is readable without a
// second round trip per row.
export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: offers, error } = await supabaseAdmin
    .from("daily_offers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const variantIds = Array.from(new Set((offers ?? []).map((o) => o.variant_id)));
  const productIds = Array.from(new Set((offers ?? []).map((o) => o.product_id)));
  const [{ data: variants }, { data: products }] = await Promise.all([
    variantIds.length
      ? supabaseAdmin.from("product_variants").select("*").in("id", variantIds)
      : Promise.resolve({ data: [] as any[] }),
    productIds.length
      ? supabaseAdmin.from("products").select("id, name, name_odia").in("id", productIds)
      : Promise.resolve({ data: [] as any[] })
  ]);
  const variantById = new Map((variants ?? []).map((v: any) => [v.id, v]));
  const productById = new Map((products ?? []).map((p: any) => [p.id, p]));

  const enriched = (offers ?? []).map((o) => ({
    ...o,
    product_name: productById.get(o.product_id)?.name ?? o.product_id,
    pack_size: variantById.get(o.variant_id)?.pack_size ?? "",
    variant_price: variantById.get(o.variant_id)?.price ?? null,
    variant_mrp: variantById.get(o.variant_id)?.mrp ?? null
  }));

  return NextResponse.json({ offers: enriched });
}

export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { productId, variantId, offerPrice, isDealOfTheDay } = await req.json();

  if (!isNonEmptyString(productId, 100) || !isNonEmptyString(variantId, 150)) {
    return NextResponse.json({ error: "Please choose a product and pack size." }, { status: 400 });
  }
  if (!isPositiveNumber(offerPrice) || offerPrice <= 0) {
    return NextResponse.json({ error: "Offer price must be a positive number." }, { status: 400 });
  }

  const { data: variant, error: variantError } = await supabaseAdmin
    .from("product_variants")
    .select("price, product_id")
    .eq("id", variantId)
    .single();
  if (variantError || !variant) {
    return NextResponse.json({ error: "That pack size could not be found." }, { status: 404 });
  }
  if (variant.product_id !== productId) {
    return NextResponse.json({ error: "That pack size doesn't belong to the selected product." }, { status: 400 });
  }
  if (offerPrice >= variant.price) {
    return NextResponse.json(
      { error: "Offer price should be lower than the current selling price — otherwise it isn't a discount." },
      { status: 400 }
    );
  }

  // Only one active Deal of the Day at a time — clear any existing one
  // before inserting. The DB's partial unique index is the real backstop
  // if two admins do this at the same instant.
  if (isDealOfTheDay) {
    await supabaseAdmin.from("daily_offers").update({ is_deal_of_the_day: false }).eq("is_deal_of_the_day", true);
  }

  const { error } = await supabaseAdmin.from("daily_offers").insert({
    product_id: productId,
    variant_id: variantId,
    offer_price: offerPrice,
    is_deal_of_the_day: !!isDealOfTheDay,
    active: true
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "There's already a Deal of the Day running. Turn that one off first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, ...fields } = await req.json();
  if (!isNonEmptyString(id, 150)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (fields.is_deal_of_the_day) {
    await supabaseAdmin.from("daily_offers").update({ is_deal_of_the_day: false }).eq("is_deal_of_the_day", true);
  }

  const { error } = await supabaseAdmin.from("daily_offers").update(fields).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "There's already a Deal of the Day running. Turn that one off first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!isNonEmptyString(id, 150)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("daily_offers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
