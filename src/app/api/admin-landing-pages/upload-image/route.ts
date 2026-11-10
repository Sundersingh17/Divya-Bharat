import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");

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
    const path = `cover-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("landing-images")
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("Landing page image upload failed", uploadError);
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from("landing-images").getPublicUrl(path);
    return NextResponse.json({ ok: true, url: data.publicUrl });
  } catch (err) {
    console.error("Landing page image upload error", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
