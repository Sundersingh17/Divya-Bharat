import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`newsletter:${getClientKey(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const { email } = await req.json();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .insert({ email: email.trim().toLowerCase() });

  // A unique-constraint violation just means they're already subscribed
  // — treat that as success rather than an error.
  if (error && error.code !== "23505") {
    console.error("Newsletter signup failed", error);
    return NextResponse.json({ error: "Could not sign you up. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
