import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { pointsEarnedForAmount, maxRedeemablePoints } from "@/lib/loyalty";

export async function getLoyaltyBalance(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("loyalty_transactions")
    .select("points")
    .eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + row.points, 0);
}

export async function earnPoints(userId: string, orderId: string, amount: number) {
  const points = pointsEarnedForAmount(amount);
  if (points <= 0) return;
  await supabaseAdmin.from("loyalty_transactions").insert({
    user_id: userId,
    order_id: orderId,
    points,
    reason: "earned"
  });
}

/** Validates the requested redemption against the user's real balance
 * server-side (never trust a redemption amount sent from the client) and
 * records it. Returns the points actually redeemed (may be less than
 * requested if it exceeded the balance or the per-order cap). */
export async function redeemPoints(
  userId: string,
  orderId: string,
  requestedPoints: number,
  subtotal: number
): Promise<number> {
  if (requestedPoints <= 0) return 0;
  const balance = await getLoyaltyBalance(userId);
  const allowed = maxRedeemablePoints(subtotal, balance);
  const toRedeem = Math.min(requestedPoints, allowed);
  if (toRedeem <= 0) return 0;

  await supabaseAdmin.from("loyalty_transactions").insert({
    user_id: userId,
    order_id: orderId,
    points: -toRedeem,
    reason: "redeemed"
  });
  return toRedeem;
}

/** Reverses any points earned for an order (e.g. on cancellation), and
 * reverses a redemption too if there was one — so a cancelled order
 * never leaves the customer with points they shouldn't have, or without
 * points they spent on an order that no longer counts. Safe to call more
 * than once; only acts if there's something un-reversed. */
export async function reversePointsForOrder(orderId: string) {
  const { data: rows } = await supabaseAdmin
    .from("loyalty_transactions")
    .select("id, user_id, points, reason")
    .eq("order_id", orderId)
    .in("reason", ["earned", "redeemed"]);

  if (!rows || rows.length === 0) return;

  const { data: reversals } = await supabaseAdmin
    .from("loyalty_transactions")
    .select("points")
    .eq("order_id", orderId)
    .eq("reason", "reversed");
  if ((reversals?.length ?? 0) > 0) return; // already handled

  for (const row of rows) {
    await supabaseAdmin.from("loyalty_transactions").insert({
      user_id: row.user_id,
      order_id: orderId,
      points: -row.points, // undo: negate an earn, restore a redemption
      reason: "reversed"
    });
  }
}
