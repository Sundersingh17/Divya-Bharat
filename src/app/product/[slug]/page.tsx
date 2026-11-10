import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/ProductDetailClient";
import { getCategories, getProductById, getProducts } from "@/lib/catalog";
import { effectivePriceRange, productInStock } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";
import { getRecipesForProduct } from "@/lib/recipes";

export const revalidate = 300;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductById(params.slug);
  if (!product) return { title: "Product not found" };

  const title = `${product.name} (${product.name_odia}) — ${product.pack_size} | Divya Bharat`;
  const { min } = effectivePriceRange(product);
  const description = `${product.description ?? ""} Buy ${product.name} online from ₹${min}, delivered pan-India from Divya Bharat Food Processing Centre, Odisha.`;

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: { title, description, type: "website" }
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [product, categories, allProducts, recipes] = await Promise.all([
    getProductById(params.slug),
    getCategories(),
    getProducts(),
    getRecipesForProduct(params.slug)
  ]);

  if (!product) notFound();

  const related = allProducts.filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    ...(product.review_count && product.review_count > 0 && product.avg_rating
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.avg_rating, reviewCount: product.review_count } }
      : {}),
    category: categories.find((c) => c.id === product.category_id)?.name,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: effectivePriceRange(product).min,
      highPrice: effectivePriceRange(product).max,
      offerCount: (product.variants?.length ?? 0) || 1,
      availability: productInStock(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/product/${product.id}`
    }
  };

  const categoryName = categories.find((c) => c.id === product.category_id)?.name;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/collections` },
      ...(categoryName ? [{ "@type": "ListItem", position: 3, name: categoryName, item: `${SITE_URL}/collections/${product.category_id}` }] : []),
      { "@type": "ListItem", position: categoryName ? 4 : 3, name: product.name, item: `${SITE_URL}/product/${product.id}` }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ProductDetailClient product={product} categories={categories} related={related} recipes={recipes} />
    </>
  );
}
