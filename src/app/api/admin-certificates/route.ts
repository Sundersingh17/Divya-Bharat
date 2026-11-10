import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString } from "@/lib/validate";

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — lab reports are often scanned PDFs
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: certs, error } = await supabaseAdmin
    .from("product_certificates")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productIds = Array.from(new Set((certs ?? []).map((c) => c.product_id)));
  const { data: products } = productIds.length
    ? await supabaseAdmin.from("products").select("id, name").in("id", productIds)
    : { data: [] as any[] };
  const productById = new Map((products ?? []).map((p: any) => [p.id, p]));

  const enriched = (certs ?? []).map((c) => ({ ...c, product_name: productById.get(c.product_id)?.name ?? c.product_id }));
  return NextResponse.json({ certificates: enriched });
}

// Uploads the file AND creates its DB row in one call — a certificate
// upload is always exactly one file plus a title, so there's no benefit
// to splitting this into two requests the way blog cover images are.
export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const productId = formData.get("productId");
    const title = formData.get("title");
    const file = formData.get("file");

    if (!isNonEmptyString(productId, 100) || !isNonEmptyString(title, 200)) {
      return NextResponse.json({ error: "productId and title are required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File must be under 8MB" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, WebP, or PDF files are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "application/pdf" ? "pdf" : "jpg";
    const path = `${productId}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-certificates")
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("Certificate upload failed", uploadError);
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from("product-certificates").getPublicUrl(path);

    const { error: insertError } = await supabaseAdmin.from("product_certificates").insert({
      product_id: productId,
      title,
      file_url: urlData.publicUrl
    });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Certificate upload error", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!isNonEmptyString(id, 100)) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("product_certificates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
