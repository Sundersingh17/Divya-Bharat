import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  if (!rateLimit(`avatar-upload:${getClientKey(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image must be under 3MB" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, or WebP images are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${userId}.jpg`;

    const { error } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (error) {
      console.error("Avatar upload failed", error);
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);

    // Save the URL onto the user's own account metadata.
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { avatar_url: data.publicUrl }
    });

    return NextResponse.json({ ok: true, url: data.publicUrl });
  } catch (err) {
    console.error("Avatar upload error", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
