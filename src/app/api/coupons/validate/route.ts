import { NextRequest, NextResponse } from "next/server";
import { isNonEmptyString, isPositiveNumber } from "@/lib/validate";
import { rateLimitShared, getClientKey } from "@/lib/rateLimit";
import { validateCoupon } from "@/lib/coupons";

export async function POST(req: NextRequest) {
  if (!(await rateLimitShared(`coupon-validate:${getClientKey(req)}`, 15, 60_000))) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { code, subtotal } = body ?? {};
  if (!isNonEmptyString(code, 50) || !isPositiveNumber(subtotal)) {
    return NextResponse.json({ error: "A code and order subtotal are required." }, { status: 400 });
  }

  const result = await validateCoupon(code, subtotal);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({
    code: result.code,
    type: result.type,
    discount: result.discount,
    freeShipping: result.freeShipping
  });
}
