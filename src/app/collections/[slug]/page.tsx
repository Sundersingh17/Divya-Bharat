import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LandingPageView from "@/components/LandingPageView";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogBrowser from "@/components/CatalogBrowser";
import { Container } from "@/components/ui";
import { getCategories, getProducts } from "@/lib/catalog";
import { getLandingPageBySlug, getLandingPages } from "@/lib/landingPages";

export const revalidate = 300;

export async function generateStaticParams() {
  const [pages, categories] = await Promise.all([getLandingPages("collection"), getCategories()]);
  const slugs = new Set<string>([...pages.map((p) => p.id), ...categories.map((c) => c.id)]);
  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getLandingPageBySlug("collection", params.slug);
  if (result) {
    return {
      title: `${result.page.title} | Divya Bharat`,
      description: result.page.subtitle || undefined,
      alternates: { canonical: `/collections/${result.page.id}` }
    };
  }
  const category = (await getCategories()).find((c) => c.id === params.slug);
  if (!category) return { title: "Page not found" };
  return {
    title: `${category.name} | Divya Bharat`,
    description: `Shop ${category.name.toLowerCase()} from Divya Bharat Food Processing Centre, delivered pan-India.`,
    alternates: { canonical: `/collections/${category.id}` }
  };
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const [result, categories] = await Promise.all([
    getLandingPageBySlug("collection", params.slug),
    getCategories()
  ]);

  // A curated landing collection wins over a category with the same slug.
  if (result) {
    return <LandingPageView page={result.page} products={result.products} categories={categories} />;
  }

  const category = categories.find((c) => c.id === params.slug);
  if (!category) notFound();

  const products = await getProducts();
  const count = products.filter((p) => p.category_id === category.id).length;

  return (
    <>
      <Header categories={categories} />
      <div className="section-pad">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-6 text-[12px] text-ink-soft">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/collections" className="hover:text-ink">Shop</Link>
            <span className="mx-2">/</span>
            <span className="text-ink" aria-current="page">{category.name}</span>
          </nav>
          <div className="mb-8 max-w-xl">
            <h1 className="heading-section text-[36px] md:text-[44px]">{category.name}</h1>
            <p className="mt-3 text-[14px] text-ink-soft">
              {count} product{count === 1 ? "" : "s"}
            </p>
          </div>
          <CatalogBrowser
            products={products}
            categories={categories}
            fixedCategory={category.id}
            basePath={`/collections/${category.id}`}
          />
        </Container>
      </div>
      <Footer />
    </>
  );
}
