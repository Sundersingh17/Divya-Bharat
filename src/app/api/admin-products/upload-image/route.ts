import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString } from "@/lib/validate";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function GET(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("product_images")
    .select("*")
    .order("product_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = (data ?? []).map((img) => ({
    ...img,
    url: supabaseAdmin.storage.from("product-images").getPublicUrl(img.storage_path).data.publicUrl
  }));
  return NextResponse.json({ images: withUrls });
}

export async function POST(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const productId = formData.get("productId");
    const file = formData.get("file");

    if (!isNonEmptyString(productId, 100)) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
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

    // How many images does this product already have? Determines both
    // the storage filename (so it doesn't collide) and the sort order
    // (so new photos append to the end of the gallery).
    const { data: existing } = await supabaseAdmin
      .from("product_images")
      .select("sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${productId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Image upload failed", uploadError);
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }

    // Optional variant/view tagging (needs migration_25; only sent when provided).
    const variantIdRaw = formData.get("variantId");
    const viewRaw = formData.get("view");
    const extra: Record<string, string> = {};
    if (typeof variantIdRaw === "string" && variantIdRaw) {
      const { data: variantRow } = await supabaseAdmin
        .from("product_variants")
        .select("id")
        .eq("id", variantIdRaw)
        .eq("product_id", productId)
        .maybeSingle();
      if (!variantRow) {
        await supabaseAdmin.storage.from("product-images").remove([path]);
        return NextResponse.json({ error: "That pack size does not belong to this product." }, { status: 400 });
      }
      extra.variant_id = variantIdRaw;
    }
    if (typeof viewRaw === "string" && ["front", "back", "other"].includes(viewRaw)) {
      extra.view = viewRaw;
    }

    const { error: insertError } = await supabaseAdmin.from("product_images").insert({
      product_id: productId,
      storage_path: path,
      sort_order: nextOrder,
      ...extra
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
    return NextResponse.json({ ok: true, url: data.publicUrl });
  } catch (err) {
    console.error("Image upload error", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!isNonEmptyString(id, 100)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const { data: row } = await supabaseAdmin.from("product_images").select("storage_path").eq("id", id).maybeSingle();
  if (row) {
    await supabaseAdmin.storage.from("product-images").remove([row.storage_path]);
  }
  const { error } = await supabaseAdmin.from("product_images").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const adminAuth = await checkAdminAuth(req);
  if (!adminAuth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, sortOrder } = await req.json();
  if (!isNonEmptyString(id, 100) || typeof sortOrder !== "number") {
    return NextResponse.json({ error: "id and sortOrder are required" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("product_images").update({ sort_order: sortOrder }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
