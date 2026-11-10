import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: recentOrders }, { data: allOrderItems }, { count: memberCount }, { count: couponRedemptions }] =
    await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, total, status, payment_status, created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("order_items")
        .select("product_name, qty, price, orders!inner(created_at)")
        .gte("orders.created_at", thirtyDaysAgo),
      supabaseAdmin.from("memberships").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin
        .from("coupons")
        .select("used_count")
        .then((r) => ({ count: (r.data ?? []).reduce((s, c: any) => s + (c.used_count ?? 0), 0) }))
    ]);

  const orders = recentOrders ?? [];
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const statusCounts: Record<string, number> = {};
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  });

  // Revenue per day for the last 7 days, for a simple bar chart.
  const dailyRevenue: { date: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayStr = day.toISOString().slice(0, 10);
    const revenue = orders
      .filter((o) => o.created_at.slice(0, 10) === dayStr)
      .reduce((sum, o) => sum + Number(o.total), 0);
    dailyRevenue.push({ date: dayStr, revenue });
  }

  // Top-selling products by quantity.
  const productTotals = new Map<string, number>();
  (allOrderItems ?? []).forEach((item: any) => {
    productTotals.set(item.product_name, (productTotals.get(item.product_name) ?? 0) + item.qty);
  });
  const topProducts = Array.from(productTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  return NextResponse.json({
    totalRevenue,
    totalOrders,
    avgOrderValue,
    statusCounts,
    dailyRevenue,
    topProducts,
    activeMembers: memberCount ?? 0,
    couponRedemptions: couponRedemptions ?? 0
  });
}
