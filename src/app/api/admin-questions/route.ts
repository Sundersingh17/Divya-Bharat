import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: questions, error } = await supabaseAdmin
    .from("product_questions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productIds = Array.from(new Set((questions ?? []).map((q) => q.product_id)));
  const { data: products } = productIds.length
    ? await supabaseAdmin.from("products").select("id, name").in("id", productIds)
    : { data: [] as any[] };
  const productById = new Map((products ?? []).map((p: any) => [p.id, p]));

  const enriched = (questions ?? []).map((q) => ({ ...q, product_name: productById.get(q.product_id)?.name ?? q.product_id }));
  return NextResponse.json({ questions: enriched });
}

export async function PATCH(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, answer } = await req.json();
  if (!isNonEmptyString(id, 100) || !isNonEmptyString(answer, 1000)) {
    return NextResponse.json({ error: "id and answer are required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("product_questions")
    .update({ answer, answered_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!isNonEmptyString(id, 100)) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("product_questions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
