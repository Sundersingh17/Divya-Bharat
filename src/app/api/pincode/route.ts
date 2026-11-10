import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

// Serviceability comes ONLY from the delivery_pincodes table the business
// maintains. With no rows (or no table yet) the checker reports
// configured:false and the storefront hides it — nothing is guessed.
export async function GET(req: NextRequest) {
  if (!rateLimit(`pincode:${getClientKey(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { count, error: countError } = await supabaseAdmin
    .from("delivery_pincodes")
    .select("pincode", { count: "exact", head: true })
    .eq("active", true);
  if (countError || !count) return NextResponse.json({ configured: false });

  const pin = req.nextUrl.searchParams.get("pin") ?? "";
  if (!/^[0-9]{6}$/.test(pin)) return NextResponse.json({ configured: true, error: "Enter a valid 6-digit PIN code." }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("delivery_pincodes")
    .select("min_days, max_days")
    .eq("pincode", pin)
    .eq("active", true)
    .maybeSingle();
  if (!data) return NextResponse.json({ configured: true, serviceable: false });
  return NextResponse.json({ configured: true, serviceable: true, minDays: data.min_days, maxDays: data.max_days });
}
