import { supabase } from "./supabaseClient";
import { Product, Category } from "./types";

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Failed to load categories", error);
    return [];
  }
  return data ?? [];
}

// Merges active daily_offers rows onto their matching variant, adding
// offer_price / is_deal_of_the_day fields the storefront reads directly
// off the variant. Mutates the variants inline (they're freshly fetched
// arrays, not shared/cached objects) to keep both call sites simple.
function applyOffers(variants: any[], offers: any[] | null) {
  if (!offers || offers.length === 0) return variants;
  const offerByVariant = new Map(offers.map((o: any) => [o.variant_id, o]));
  return variants.map((v) => {
    const offer = offerByVariant.get(v.id);
    if (!offer) return v;
    return { ...v, offer_price: offer.offer_price, is_deal_of_the_day: offer.is_deal_of_the_day };
  });
}

export async function getProducts(): Promise<Product[]> {
  const [{ data, error }, { data: ratings }, { data: variants }, { data: images }, { data: offers }] =
    await Promise.all([
      supabase.from("products").select("*").eq("is_active", true).order("name", { ascending: true }),
      supabase.from("product_ratings").select("*"),
      supabase.from("product_variants").select("*").order("sort_order", { ascending: true }),
      supabase.from("product_images").select("*").order("sort_order", { ascending: true }),
      supabase.from("daily_offers").select("*").eq("active", true)
    ]);
  if (error) {
    console.error("Failed to load products", error);
    return [];
  }
  const ratingMap = new Map((ratings ?? []).map((r: any) => [r.product_id, r]));
  const variantsByProduct = new Map<string, any[]>();
  applyOffers(variants ?? [], offers).forEach((v: any) => {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  });
  const imagesByProduct = new Map<string, any[]>();
  (images ?? []).forEach((img: any) => {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push(img);
    imagesByProduct.set(img.product_id, list);
  });
  return (data ?? []).map((p) => ({
    ...p,
    avg_rating: ratingMap.get(p.id)?.avg_rating ?? null,
    review_count: ratingMap.get(p.id)?.review_count ?? 0,
    variants: variantsByProduct.get(p.id) ?? [],
    images: imagesByProduct.get(p.id) ?? []
  }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const [{ data, error }, { data: rating }, { data: variants }, { data: images }, { data: offers }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).single(),
      supabase.from("product_ratings").select("*").eq("product_id", id).maybeSingle(),
      supabase.from("product_variants").select("*").eq("product_id", id).order("sort_order", { ascending: true }),
      supabase.from("product_images").select("*").eq("product_id", id).order("sort_order", { ascending: true }),
      supabase.from("daily_offers").select("*").eq("active", true)
    ]);
  if (error) {
    console.error("Failed to load product", error);
    return null;
  }
  return {
    ...data,
    avg_rating: rating?.avg_rating ?? null,
    review_count: rating?.review_count ?? 0,
    variants: applyOffers(variants ?? [], offers),
    images: images ?? []
  };
}

// Every currently active offer, joined with enough product/variant info
// for the storefront to render a "Deal of the Day" + "Today's Offers"
// strip without a separate round trip per product.
export async function getActiveDailyOffers() {
  const { data: offers, error } = await supabase.from("daily_offers").select("*").eq("active", true);
  if (error || !offers || offers.length === 0) {
    if (error) console.error("Failed to load daily offers", error);
    return [];
  }
  const productIds = Array.from(new Set(offers.map((o: any) => o.product_id)));
  const variantIds = Array.from(new Set(offers.map((o: any) => o.variant_id)));
  const [{ data: products }, { data: variants }, { data: images }] = await Promise.all([
    supabase.from("products").select("*").in("id", productIds),
    supabase.from("product_variants").select("*").in("id", variantIds),
    supabase.from("product_images").select("*").in("product_id", productIds).order("sort_order", { ascending: true })
  ]);
  const productById = new Map((products ?? []).map((p: any) => [p.id, p]));
  const variantById = new Map((variants ?? []).map((v: any) => [v.id, v]));
  const imagesByProduct = new Map<string, any[]>();
  (images ?? []).forEach((img: any) => {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push(img);
    imagesByProduct.set(img.product_id, list);
  });

  return offers
    .map((offer: any) => {
      const product = productById.get(offer.product_id);
      const variant = variantById.get(offer.variant_id);
      if (!product || !variant) return null; // stale offer row referencing a deleted product/variant
      return {
        ...product,
        images: imagesByProduct.get(product.id) ?? [],
        variants: [{ ...variant, offer_price: offer.offer_price, is_deal_of_the_day: offer.is_deal_of_the_day }]
      } as Product;
    })
    .filter((p): p is Product => p !== null);
}

export type FeaturedReview = {
  id: string;
  rating: number;
  review_text: string;
  is_verified_purchase: boolean;
  product_id: string;
  product_name: string;
  created_at: string;
};

// Recent 4★+ written reviews for the homepage trust section. Purely a
// read of the existing reviews table (public-readable via RLS) — nothing
// is invented, so if there are no qualifying reviews yet the section
// simply doesn't render them.
export async function getFeaturedReviews(limit = 3): Promise<FeaturedReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, review_text, is_verified_purchase, product_id, created_at")
    .gte("rating", 4)
    .not("review_text", "is", null)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error || !data) {
    if (error) console.error("Failed to load featured reviews", error);
    return [];
  }
  const withText = data.filter((r: any) => r.review_text && r.review_text.trim().length >= 20).slice(0, limit);
  if (withText.length === 0) return [];
  const ids = Array.from(new Set(withText.map((r: any) => r.product_id)));
  const { data: products } = await supabase.from("products").select("id, name").in("id", ids);
  const nameById = new Map((products ?? []).map((p: any) => [p.id, p.name]));
  return withText.map((r: any) => ({ ...r, product_name: nameById.get(r.product_id) ?? "" }));
}
