import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogBrowser from "@/components/CatalogBrowser";
import CategoryTiles from "@/components/CategoryTiles";
import { Container } from "@/components/ui";
import { getCategories, getProducts } from "@/lib/catalog";
import { getLandingPages } from "@/lib/landingPages";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shop all products | Divya Bharat",
  description:
    "Browse and search the full Divya Bharat range — oils, chhatua, flours, dal, spices and more, delivered pan-India.",
  alternates: { canonical: "/collections" }
};

export default async function ShopPage() {
  const [categories, products, curated] = await Promise.all([
    getCategories(),
    getProducts(),
    getLandingPages("collection")
  ]);

  return (
    <>
      <Header categories={categories} />
      <div className="section-pad">
        <Container>
          <div className="mb-8 max-w-xl">
            <div className="eyebrow mb-3">The full range</div>
            <h1 className="heading-section text-[36px] md:text-[44px]">Shop</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
              Search by name, filter by category, price or pack size, and sort to suit you.
            </p>
          </div>

          <CategoryTiles categories={categories} products={products} />

          {curated.length > 0 && (
            <nav aria-label="Curated collections" className="mb-8 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[.14em] text-ink-soft">Curated</span>
              {curated.map((c) => (
                <Link key={c.id} href={`/collections/${c.id}`} className="pill">
                  {c.title}
                </Link>
              ))}
            </nav>
          )}

          <CatalogBrowser products={products} categories={categories} basePath="/collections" />
        </Container>
      </div>
      <Footer />
    </>
  );
}
