import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString, isPositiveNumber } from "@/lib/validate";
import { notifyRestock } from "@/lib/restock";
import { checkLowStock } from "@/lib/stock";
import { revalidateStorefront } from "@/lib/revalidateStore";

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .select("*")
    .order("product_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variants: data });
}

export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { productId, packSize, price, mrp, stockQty, isDefault } = await req.json();

  if (!isNonEmptyString(productId, 100) || !isNonEmptyString(packSize, 50)) {
    return NextResponse.json({ error: "productId and packSize are required." }, { status: 400 });
  }
  if (!isPositiveNumber(price) || !isPositiveNumber(mrp)) {
    return NextResponse.json({ error: "price and mrp must be valid numbers." }, { status: 400 });
  }

  const slug = packSize.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const id = `${productId}-${slug}`;

  if (isDefault) {
    await supabaseAdmin.from("product_variants").update({ is_default: false }).eq("product_id", productId);
  }

  const { error } = await supabaseAdmin.from("product_variants").insert({
    id,
    product_id: productId,
    pack_size: packSize,
    price,
    mrp,
    stock_qty: isPositiveNumber(stockQty) ? stockQty : 100,
    is_default: !!isDefault,
    sort_order: 99
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That pack size already exists for this product." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  revalidateStorefront();
  return NextResponse.json({ ok: true, id }, { status: 201 });
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

  if (fields.is_default) {
    const { data: variant } = await supabaseAdmin
      .from("product_variants")
      .select("product_id")
      .eq("id", id)
      .single();
    if (variant) {
      await supabaseAdmin
        .from("product_variants")
        .update({ is_default: false })
        .eq("product_id", variant.product_id);
    }
  }

  let wasOut = false;
  if (typeof fields.stock_qty === "number" && fields.stock_qty > 0) {
    const { data: before } = await supabaseAdmin.from("product_variants").select("stock_qty").eq("id", id).maybeSingle();
    wasOut = !!before && before.stock_qty <= 0;
  }

  const { error } = await supabaseAdmin.from("product_variants").update(fields).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Back in stock: tell everyone who asked (fire-and-forget; never blocks the admin edit).
  if (wasOut) notifyRestock(id).catch((e) => console.error("Restock notify failed", e));
  // Stock set at/below the low-stock level: alert now (email + health log), not only after a sale.
  if (typeof fields.stock_qty === "number") await checkLowStock([id]);
  revalidateStorefront();
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
  const { error } = await supabaseAdmin.from("product_variants").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateStorefront();
  return NextResponse.json({ ok: true });
}
