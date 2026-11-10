export const MEMBERSHIP_DISCOUNT_PCT = 10;

export const MEMBERSHIP_PLANS = [
  { id: "monthly" as const, label: "Monthly", price: 99, days: 30 },
  { id: "yearly" as const, label: "Yearly", price: 899, days: 365, badge: "Best value" }
];

export type MembershipPlanId = (typeof MEMBERSHIP_PLANS)[number]["id"];

export function getPlan(id: string) {
  return MEMBERSHIP_PLANS.find((p) => p.id === id);
}
