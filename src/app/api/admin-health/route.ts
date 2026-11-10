import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [low, events, orders, carts, products] = await Promise.all([
    supabaseAdmin.from("product_variants").select("id, product_id, pack_size, stock_qty").lte("stock_qty", LOW_STOCK_THRESHOLD).order("stock_qty"),
    supabaseAdmin.from("system_events").select("type, detail, created_at").gte("created_at", since7).order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("orders").select("payment_method, payment_status, status").gte("created_at", since30),
    supabaseAdmin.from("cart_snapshots").select("reminded_at, converted").gte("created_at", since30),
    supabaseAdmin.from("products").select("id, name"),
  ]);

  // Is the automatic stock deduction (migration_27) installed? A zero-quantity
  // call on a non-existent id returns false when it exists, errors when it doesn't.
  const probe = await supabaseAdmin.rpc("reserve_stock", { p_variant_id: "__probe__", p_qty: 0 });
  const stockTracking = !probe.error;

  const nameById = new Map((products.data ?? []).map((p: any) => [p.id, p.name]));
  const eventRows = events.data ?? [];
  const eventCounts: Record<string, number> = {};
  eventRows.forEach((e: any) => (eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1));

  const o = orders.data ?? [];
  const cs = carts.data ?? [];

  return NextResponse.json({
    threshold: LOW_STOCK_THRESHOLD,
    stockTracking,
    lowStock: (low.data ?? []).map((v: any) => ({ id: v.id, name: nameById.get(v.product_id) ?? v.product_id, pack: v.pack_size, stock: v.stock_qty })),
    eventCounts,
    recentEvents: eventRows.slice(0, 20),
    // eventsTableMissing => migration_27 not run yet
    eventsTableMissing: !!events.error,
    orders30d: {
      total: o.length,
      cod: o.filter((x: any) => x.payment_method === "COD").length,
      online: o.filter((x: any) => x.payment_method === "Razorpay").length,
      cancelled: o.filter((x: any) => x.status === "Cancelled").length,
    },
    abandoned30d: {
      snapshots: cs.length,
      reminded: cs.filter((c: any) => c.reminded_at).length,
      recovered: cs.filter((c: any) => c.converted).length,
    },
  });
}
