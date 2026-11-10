import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString, isPositiveNumber } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupons: data });
}

export async function POST(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { code, type, value, min_order_value, usage_limit } = await req.json();

  if (!isNonEmptyString(code, 50) || !/^[A-Z0-9]+$/.test(code)) {
    return NextResponse.json({ error: "Code must be uppercase letters/numbers only." }, { status: 400 });
  }
  if (!["percent", "flat", "free_shipping"].includes(type)) {
    return NextResponse.json({ error: "Invalid coupon type." }, { status: 400 });
  }
  if (type !== "free_shipping" && !isPositiveNumber(value)) {
    return NextResponse.json({ error: "Value must be a positive number." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("coupons").insert({
    code: code.toUpperCase(),
    type,
    value: type === "free_shipping" ? 0 : value,
    min_order_value: isPositiveNumber(min_order_value) ? min_order_value : 0,
    usage_limit: usage_limit || null,
    is_active: true
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That code already exists." }, { status: 409 });
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
  const { code, ...fields } = await req.json();
  if (!isNonEmptyString(code, 50)) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("coupons").update(fields).eq("code", code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
