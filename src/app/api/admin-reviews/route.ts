import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("reviews").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = Array.from(new Set((data ?? []).map((r: any) => r.product_id)));
  const { data: products } = ids.length ? await supabaseAdmin.from("products").select("id, name").in("id", ids) : { data: [] as any[] };
  const nameById = new Map((products ?? []).map((p: any) => [p.id, p.name]));
  return NextResponse.json({ reviews: (data ?? []).map((r: any) => ({ ...r, product_name: nameById.get(r.product_id) ?? r.product_id })) });
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!isNonEmptyString(id, 60)) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
