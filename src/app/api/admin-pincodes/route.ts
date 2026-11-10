import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("delivery_pincodes").select("*").order("pincode").limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pincodes: data });
}

// Body: { lines: "751001,2,4\n751002,3,5" }  (pincode,min_days,max_days)
export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { lines } = await req.json();
  if (typeof lines !== "string" || lines.length > 200_000) {
    return NextResponse.json({ error: "Paste lines as: pincode,min_days,max_days" }, { status: 400 });
  }
  const rows: { pincode: string; min_days: number; max_days: number; active: boolean; updated_at: string }[] = [];
  const bad: string[] = [];
  for (const raw of lines.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [pin, min, max] = line.split(/[,\s]+/);
    const mn = Number(min), mx = Number(max);
    if (!/^[0-9]{6}$/.test(pin ?? "") || !Number.isInteger(mn) || !Number.isInteger(mx) || mn < 0 || mx < mn) {
      bad.push(line);
      continue;
    }
    rows.push({ pincode: pin, min_days: mn, max_days: mx, active: true, updated_at: new Date().toISOString() });
  }
  if (bad.length > 0) return NextResponse.json({ error: `Fix these lines: ${bad.slice(0, 5).join(" | ")}` }, { status: 400 });
  if (rows.length === 0) return NextResponse.json({ error: "No rows to save." }, { status: 400 });
  const { error } = await supabaseAdmin.from("delivery_pincodes").upsert(rows, { onConflict: "pincode" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, saved: rows.length }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pin = req.nextUrl.searchParams.get("pin");
  if (!pin || !/^[0-9]{6}$/.test(pin)) return NextResponse.json({ error: "pin required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("delivery_pincodes").delete().eq("pincode", pin);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
