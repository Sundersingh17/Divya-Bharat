import { NextRequest, NextResponse } from "next/server";
import { revalidateStorefront } from "@/lib/revalidateStore";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString, isPositiveNumber, sanitizeText } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [{ data: products, error }, { data: categories }] = await Promise.all([
    supabaseAdmin.from("products").select("*").order("name"),
    supabaseAdmin.from("categories").select("*").order("sort_order")
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products, categories });
}

export async function POST(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { id, name, name_odia, category_id, description, price, mrp, pack_size, stock_qty } = body;

  if (!isNonEmptyString(id, 100) || !/^[a-z0-9-]+$/.test(id)) {
    return NextResponse.json(
      { error: "Product ID must be lowercase letters, numbers, and hyphens only." },
      { status: 400 }
    );
  }
  if (!isNonEmptyString(name, 200) || !isNonEmptyString(category_id, 100) || !isNonEmptyString(pack_size, 50)) {
    return NextResponse.json({ error: "Name, category, and pack size are required." }, { status: 400 });
  }
  if (!isPositiveNumber(price) || !isPositiveNumber(mrp)) {
    return NextResponse.json({ error: "Price and MRP must be valid numbers." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("products").insert({
    id,
    name: sanitizeText(name),
    name_odia: name_odia ? sanitizeText(name_odia) : "",
    category_id,
    description: description ? sanitizeText(description) : null,
    price,
    mrp,
    pack_size: sanitizeText(pack_size),
    stock_qty: isPositiveNumber(stock_qty) ? stock_qty : 100,
    is_active: true
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A product with that ID already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, ...fields } = await req.json();
  if (!isNonEmptyString(id, 100)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("products").update(fields).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateStorefront();
  return NextResponse.json({ ok: true });
}
