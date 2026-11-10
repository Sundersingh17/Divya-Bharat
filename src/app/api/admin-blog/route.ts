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

  const { data: posts, error } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, excerpt, content, coverImageUrl, category, published } = await req.json();
  if (!isNonEmptyString(title, 200) || !isNonEmptyString(content, 50000)) {
    return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
  }

  let slug = slugify(title);
  if (!slug) return NextResponse.json({ error: "Please choose a title with letters or numbers." }, { status: 400 });

  // Slugs are the primary key, so make sure we're not colliding with an
  // existing post — append -2, -3, etc. rather than failing outright.
  let attempt = slug;
  let n = 2;
  while (true) {
    const { data: existing } = await supabaseAdmin.from("blog_posts").select("id").eq("id", attempt).maybeSingle();
    if (!existing) break;
    attempt = `${slug}-${n}`;
    n++;
  }
  slug = attempt;

  const { error } = await supabaseAdmin.from("blog_posts").insert({
    id: slug,
    title,
    excerpt: excerpt || null,
    content,
    cover_image_url: coverImageUrl || null,
    category: category || null,
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

  // Client sends camelCase for the couple of fields whose DB column
  // differs — translate before writing.
  const patch: Record<string, any> = { ...fields, updated_at: new Date().toISOString() };
  if ("coverImageUrl" in patch) {
    patch.cover_image_url = patch.coverImageUrl;
    delete patch.coverImageUrl;
  }

  const { error } = await supabaseAdmin.from("blog_posts").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!isNonEmptyString(id, 200)) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
