import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "Divya Bharat <onboarding@resend.dev>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

function checkCronAuth(req: NextRequest): boolean {
  // Vercel Cron sends this header automatically when CRON_SECRET is set
  // as an environment variable — see the "Cron setup" note in the README.
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || !checkCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!resend) {
    return NextResponse.json({ skipped: "RESEND_API_KEY not set" });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: snapshots, error } = await supabaseAdmin
    .from("cart_snapshots")
    .select("*")
    .eq("converted", false)
    .is("reminded_at", null)
    .lt("updated_at", oneHourAgo)
    .limit(50);

  if (error) {
    console.error("Failed to fetch abandoned carts", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const snap of snapshots ?? []) {
    const items = snap.items as { name: string; qty: number; price: number }[];
    const restoreUrl = `${SITE_URL}/cart/restore/${snap.token}`;
    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: snap.email,
        subject: "You left something in your cart",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#B85C38;">Still thinking it over?</h2>
            <p>You left ${items.length} item${items.length === 1 ? "" : "s"} in your cart at Divya Bharat:</p>
            <ul>${items.map((i) => `<li>${i.name} × ${i.qty}</li>`).join("")}</ul>
            <p style="margin:20px 0;">
              <a href="${restoreUrl}" style="background:#B85C38;color:#FBF6EE;padding:12px 24px;border-radius:8px;text-decoration:none;">
                Resume checkout
              </a>
            </p>
            <p style="color:#666;font-size:12px;">This link restores your cart exactly as you left it.</p>
          </div>
        `
      });
      await supabaseAdmin
        .from("cart_snapshots")
        .update({ reminded_at: new Date().toISOString() })
        .eq("id", snap.id);
      sent++;
    } catch (err) {
      console.error("Failed to send abandoned cart email", err);
    }
  }

  return NextResponse.json({ checked: snapshots?.length ?? 0, sent });
}
