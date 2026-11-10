import { supabase } from "./supabaseClient";
import { getProducts } from "./catalog";
import { Product } from "./types";

export type LandingPage = {
  id: string; // slug
  type: "use-case" | "collection";
  title: string;
  subtitle: string | null;
  content: string | null;
  product_ids: string[];
  cover_image_url: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export async function getLandingPages(type: "use-case" | "collection"): Promise<LandingPage[]> {
  const { data, error } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("type", type)
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load landing pages", error);
    return [];
  }
  return data ?? [];
}

export async function getLandingPageBySlug(
  type: "use-case" | "collection",
  slug: string
): Promise<{ page: LandingPage; products: Product[] } | null> {
  const { data: page, error } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("type", type)
    .eq("id", slug)
    .eq("published", true)
    .maybeSingle();
  if (error || !page) {
    if (error) console.error("Failed to load landing page", error);
    return null;
  }

  // The full catalog is small enough here that filtering client-side
  // after one fetch is simpler than a second query, and it reuses
  // getProducts()'s existing offer/rating/image merging for free.
  const allProducts = await getProducts();
  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const products = page.product_ids.map((id: string) => productById.get(id)).filter(Boolean) as Product[];

  return { page, products };
}
