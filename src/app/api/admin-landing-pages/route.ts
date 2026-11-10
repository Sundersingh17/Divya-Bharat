import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString } from "@/lib/validate";

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pages, error } = await supabaseAdmin
    .from("landing_pages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, title, subtitle, content, productIds, coverImageUrl, published } = await req.json();
  if (!["use-case", "collection"].includes(type) || !isNonEmptyString(title, 200)) {
    return NextResponse.json({ error: "A valid type and title are required." }, { status: 400 });
  }

  let slug = slugify(title);
  if (!slug) return NextResponse.json({ error: "Please choose a title with letters or numbers." }, { status: 400 });

  let attempt = slug;
  let n = 2;
  while (true) {
    const { data: existing } = await supabaseAdmin.from("landing_pages").select("id").eq("id", attempt).maybeSingle();
    if (!existing) break;
    attempt = `${slug}-${n}`;
    n++;
  }
  slug = attempt;

  const { error } = await supabaseAdmin.from("landing_pages").insert({
    id: slug,
    type,
    title,
    subtitle: subtitle || null,
    content: content || null,
    product_ids: Array.isArray(productIds) ? productIds : [],
    cover_image_url: coverImageUrl || null,
    published: published !== false
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: slug }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...fields } = await req.json();
  if (!isNonEmptyString(id, 200)) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const patch: Record<string, any> = { ...fields, updated_at: new Date().toISOString() };
  if ("coverImageUrl" in patch) {
    patch.cover_image_url = patch.coverImageUrl;
    delete patch.coverImageUrl;
  }
  if ("productIds" in patch) {
    patch.product_ids = Array.isArray(patch.productIds) ? patch.productIds : [];
    delete patch.productIds;
  }

  const { error } = await supabaseAdmin.from("landing_pages").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!isNonEmptyString(id, 200)) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("landing_pages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
