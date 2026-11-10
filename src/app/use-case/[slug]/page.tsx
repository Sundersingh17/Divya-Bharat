import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPageView from "@/components/LandingPageView";
import { getCategories } from "@/lib/catalog";
import { getLandingPageBySlug, getLandingPages } from "@/lib/landingPages";

export const revalidate = 300;

export async function generateStaticParams() {
  const pages = await getLandingPages("use-case");
  return pages.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getLandingPageBySlug("use-case", params.slug);
  if (!result) return { title: "Page not found" };
  return {
    title: `${result.page.title} | Divya Bharat`,
    description: result.page.subtitle || undefined,
    alternates: { canonical: `/use-case/${result.page.id}` }
  };
}

export default async function UseCasePage({ params }: { params: { slug: string } }) {
  const [result, categories] = await Promise.all([getLandingPageBySlug("use-case", params.slug), getCategories()]);
  if (!result) notFound();
  return <LandingPageView page={result.page} products={result.products} categories={categories} />;
}
