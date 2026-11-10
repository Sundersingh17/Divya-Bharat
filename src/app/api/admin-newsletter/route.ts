import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }).limit(10000);
  if (error) {
    console.error("admin-newsletter load failed", error);
    // Table not created yet (migration_24_newsletter.sql was never run on this database).
    if (/PGRST205|42P01|does not exist|schema cache/i.test(`${error.code ?? ""} ${error.message ?? ""}`)) {
      return NextResponse.json({ subscribers: [], tableMissing: true });
    }
    return NextResponse.json({ error: error.message || "Could not load subscribers." }, { status: 500 });
  }

  if (req.nextUrl.searchParams.get("format") === "csv") {
    // Prefix formula-like cells so spreadsheets never execute them.
    const safe = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);
    const csv = ["email,subscribed_at", ...(data ?? []).map((r: any) => `${safe(String(r.email)).replace(/,/g, "")},${r.created_at ?? ""}`)].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=newsletter-subscribers.csv" } });
  }
  return NextResponse.json({ subscribers: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("newsletter_subscribers").delete().eq("email", email.toLowerCase());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
