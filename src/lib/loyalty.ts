// Earn 1 point per ₹20 spent (after discounts), redeem 1 point = ₹1 off a
// future order. A redemption can cover at most half of an order's
// subtotal, so points supplement a purchase rather than fully paying
// for one — keeps the program sustainable.
export const POINTS_PER_RUPEE_SPENT = 1 / 20;
export const RUPEES_PER_POINT_REDEEMED = 1;
export const MAX_REDEMPTION_SHARE = 0.5;

export function pointsEarnedForAmount(amount: number): number {
  return Math.floor(amount * POINTS_PER_RUPEE_SPENT);
}

export function maxRedeemablePoints(subtotal: number, balance: number): number {
  const capByOrder = Math.floor((subtotal * MAX_REDEMPTION_SHARE) / RUPEES_PER_POINT_REDEEMED);
  return Math.max(0, Math.min(balance, capByOrder));
}
