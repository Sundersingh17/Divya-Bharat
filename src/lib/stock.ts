import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logEvent } from "@/lib/events";
import { sendLowStockAlertEmail } from "@/lib/email";
import { revalidateStorefront } from "@/lib/revalidateStore";

export const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? process.env.NEXT_PUBLIC_LOW_STOCK_THRESHOLD ?? 10);

type Line = { variantId: string; qty: number };

function rpcMissing(error: any) {
  const m = `${error?.message ?? ""} ${error?.code ?? ""}`;
  return /reserve_stock|release_stock|PGRST202|42883/.test(m);
}

/** Atomically takes stock for every line. All-or-nothing.
 * Returns { configured:false } if migration_27 hasn't been run (stock then
 * stays as before: checked at quote time but not decremented). */
export async function reserveStock(lines: Line[]): Promise<{ ok: boolean; configured: boolean; failed?: string }> {
  const done: Line[] = [];
  for (const l of lines) {
    const { data, error } = await supabaseAdmin.rpc("reserve_stock", { p_variant_id: l.variantId, p_qty: l.qty });
    if (error) {
      await releaseStock(done);
      if (rpcMissing(error)) return { ok: true, configured: false };
      console.error("reserve_stock failed", error);
      return { ok: false, configured: true, failed: l.variantId };
    }
    if (!data) {
      await releaseStock(done);
      await logEvent("stock_race", { variantId: l.variantId, qty: l.qty });
      return { ok: false, configured: true, failed: l.variantId };
    }
    done.push(l);
  }
  return { ok: true, configured: true };
}

export async function releaseStock(lines: Line[]) {
  for (const l of lines) {
    const { error } = await supabaseAdmin.rpc("release_stock", { p_variant_id: l.variantId, p_qty: l.qty });
    if (error) console.error("release_stock failed", l, error);
  }
}

/** After a sale, alert the business about variants that fell to the threshold or below. */
export async function checkLowStock(variantIds: string[]) {
  try {
    const { data } = await supabaseAdmin
      .from("product_variants")
      .select("id, product_id, pack_size, stock_qty")
      .in("id", variantIds)
      .lte("stock_qty", LOW_STOCK_THRESHOLD);
    if (!data || data.length === 0) return;
    for (const v of data) await logEvent("low_stock", { variantId: v.id, pack: v.pack_size, stock: v.stock_qty });
    await sendLowStockAlertEmail(data.map((v: any) => ({ product: v.product_id, pack: v.pack_size, stock: v.stock_qty })));
  } catch (err) {
    console.error("checkLowStock failed", err);
  }
}

/** Puts back stock that an order reserved (no-op for orders that never reserved). */
export async function restoreStockForOrder(orderId: string) {
  const { data: ord } = await supabaseAdmin.from("orders").select("stock_reserved").eq("id", orderId).maybeSingle();
  if (!ord?.stock_reserved) return;
  const { data: lines } = await supabaseAdmin.from("order_items").select("variant_id, qty").eq("order_id", orderId);
  await releaseStock((lines ?? []).filter((l: any) => l.variant_id).map((l: any) => ({ variantId: l.variant_id, qty: l.qty })));
  await supabaseAdmin.from("orders").update({ stock_reserved: false }).eq("id", orderId);
  revalidateStorefront();
}
