import { supabase } from "./supabaseClient";
import { getProducts } from "./catalog";
import type { Product } from "./types";
import type { BlogPost } from "./blog";

// Recipes link to real products simply by linking /product/<id> in their
// Markdown (e.g. [mustard oil](/product/mustard-oil)). No extra data to
// maintain, and nothing is shown that the author didn't link.
export function extractProductIds(markdown: string): string[] {
  const ids = new Set<string>();
  for (const m of markdown.matchAll(/\/product\/([a-z0-9][a-z0-9-]*)/gi)) ids.add(m[1].toLowerCase());
  return Array.from(ids);
}

export async function getProductsInPost(post: BlogPost): Promise<Product[]> {
  const ids = extractProductIds(post.content);
  if (ids.length === 0) return [];
  const all = await getProducts();
  const byId = new Map(all.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
}

export async function getRecipesForProduct(productId: string, limit = 3) {
  const safe = productId.replace(/[^a-z0-9-]/gi, "");
  if (!safe) return [];
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, title, excerpt, cover_image_url, category")
    .eq("published", true)
    .ilike("content", `%/product/${safe}%`)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as { id: string; title: string; excerpt: string | null; cover_image_url: string | null; category: string | null }[];
}
