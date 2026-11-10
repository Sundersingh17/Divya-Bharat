import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString } from "@/lib/validate";
import { sendReturnStatusEmail } from "@/lib/email";

const VALID_STATUSES = ["Requested", "Approved", "Rejected", "Refunded"];

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: returns, error } = await supabaseAdmin
    .from("return_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orderIds = Array.from(new Set((returns ?? []).map((r) => r.order_id)));
  const { data: orders } = orderIds.length
    ? await supabaseAdmin.from("orders").select("id, customer_name, email, phone, total").in("id", orderIds)
    : { data: [] as any[] };
  const orderById = new Map((orders ?? []).map((o: any) => [o.id, o]));

  const enriched = (returns ?? []).map((r) => ({ ...r, order: orderById.get(r.order_id) ?? null }));
  return NextResponse.json({ returns: enriched });
}

export async function PATCH(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, adminNote } = await req.json();
  if (!isNonEmptyString(id, 100) || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("return_requests")
    .update({ status, admin_note: adminNote ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("order_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("email, customer_name")
    .eq("id", updated.order_id)
    .maybeSingle();
  if (order?.email) {
    sendReturnStatusEmail({
      to: order.email,
      orderId: updated.order_id,
      customerName: order.customer_name,
      status
    });
  }

  return NextResponse.json({ ok: true });
}
