import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isNonEmptyString, isPositiveNumber, isValidCartItem } from "@/lib/validate";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";

export async function POST(req: NextRequest) {
  if (!rateLimit(`cart-snapshot:${getClientKey(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const { email, items, subtotal } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0 || !items.every(isValidCartItem)) {
      return NextResponse.json({ error: "Invalid cart items." }, { status: 400 });
    }
    if (!isPositiveNumber(subtotal)) {
      return NextResponse.json({ error: "Invalid subtotal." }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(req);

    // Reuse an existing non-converted snapshot for this email if one was
    // updated recently, rather than creating a new row on every keystroke.
    const { data: existing } = await supabaseAdmin
      .from("cart_snapshots")
      .select("id, token")
      .eq("email", email.toLowerCase())
      .eq("converted", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("cart_snapshots")
        .update({ items, subtotal, user_id: userId, updated_at: new Date().toISOString(), reminded_at: null })
        .eq("id", existing.id);
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomBytes(16).toString("hex");
    await supabaseAdmin.from("cart_snapshots").insert({
      token,
      user_id: userId,
      email: email.toLowerCase(),
      items,
      subtotal
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Cart snapshot saving is a background convenience — never surface
    // this as an error to someone trying to check out.
    console.error("Failed to save cart snapshot", err);
    return NextResponse.json({ ok: false });
  }
}

export async function GET(req: NextRequest) {
  if (!rateLimit(`cart-snapshot-get:${getClientKey(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const token = req.nextUrl.searchParams.get("token");
  if (!isNonEmptyString(token, 100)) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("cart_snapshots")
    .select("items, subtotal, converted")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ items: data.items, subtotal: data.subtotal, converted: data.converted });
}
