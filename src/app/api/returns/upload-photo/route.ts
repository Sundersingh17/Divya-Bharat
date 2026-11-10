import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { isNonEmptyString } from "@/lib/validate";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  if (!rateLimit(`return-photo-upload:${getClientKey(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many uploads. Please wait a moment." }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const orderId = formData.get("orderId");
    const file = formData.get("file");

    if (!isNonEmptyString(orderId, 50)) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }
    // Confirms the order is real (not that the caller owns it — the
    // POST /api/returns call that follows does the real ownership
    // check). This just stops random files being dumped against
    // made-up order IDs.
    const { data: order } = await supabaseAdmin.from("orders").select("id").eq("id", orderId).maybeSingle();
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, or WebP images are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${orderId}-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("return-photos")
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("Return photo upload failed", uploadError);
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from("return-photos").getPublicUrl(path);
    return NextResponse.json({ ok: true, url: data.publicUrl });
  } catch (err) {
    console.error("Return photo upload error", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
