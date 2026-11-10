import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendRestockEmail } from "@/lib/email";

/** Emails everyone waiting on this variant and marks them notified. */
export async function notifyRestock(variantId: string) {
  const { data: variant } = await supabaseAdmin
    .from("product_variants")
    .select("id, product_id, pack_size, stock_qty")
    .eq("id", variantId)
    .maybeSingle();
  if (!variant || variant.stock_qty <= 0) return;

  const [{ data: product }, { data: waiting }] = await Promise.all([
    supabaseAdmin.from("products").select("name").eq("id", variant.product_id).maybeSingle(),
    supabaseAdmin.from("restock_requests").select("id, email").eq("variant_id", variantId).is("notified_at", null)
  ]);
  if (!product || !waiting || waiting.length === 0) return;

  for (const w of waiting) {
    const sent = await sendRestockEmail({
      to: w.email,
      productName: product.name,
      packSize: variant.pack_size,
      productId: variant.product_id
    });
    if (sent) await supabaseAdmin.from("restock_requests").update({ notified_at: new Date().toISOString() }).eq("id", w.id);
  }
}
