"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryStrip from "@/components/CategoryStrip";
import ProductGrid from "@/components/ProductGrid";
import DailyOffers from "@/components/DailyOffers";
import ProductFilters, { defaultFilters, isFilterActive, ProductFilterState } from "@/components/ProductFilters";
import Hero from "@/components/home/Hero";
import LazyMount from "@/components/pantry/LazyMount";
import CategoryShowcase from "@/components/home/CategoryShowcase";
import Marquee from "@/components/home/Marquee";
import CustomerFavourites from "@/components/home/CustomerFavourites";
import BrandStory from "@/components/home/BrandStory";
import Statement from "@/components/home/Statement";
import PantryFlow from "@/components/home/PantryFlow";
import ShopByNeed from "@/components/home/ShopByNeed";
import TrustSection from "@/components/home/TrustSection";
import RecipesPreview from "@/components/home/RecipesPreview";
import NewsletterCTA from "@/components/home/NewsletterCTA";
import { Container, Reveal, SectionHeading } from "@/components/ui";
import { effectivePriceRange, productInStock, productPackSizes } from "@/lib/pricing";
import { useLanguage } from "@/context/LanguageContext";
import { Category, Product } from "@/lib/types";
import type { FeaturedReview } from "@/lib/catalog";
import { BlogPost } from "@/lib/blog";
import { LandingPage } from "@/lib/landingPages";

// The pantry scenes are code-split and only mounted when the visitor scrolls
// close to them, so they never delay the first paint of the homepage.
const HeritagePantry = dynamic(() => import("@/components/home/HeritagePantry"), { ssr: false });
const OilTurntable = dynamic(() => import("@/components/home/OilTurntable"), { ssr: false });

export default function HomeClient({
  initialCategories,
  initialProducts,
  initialOffers,
  reviews,
  posts,
  useCases
}: {
  initialCategories: Category[];
  initialProducts: Product[];
  initialOffers?: Product[];
  reviews?: FeaturedReview[];
  posts?: BlogPost[];
  useCases?: LandingPage[];
}) {
  return (
    <Suspense fallback={null}>
      <HomeContent
        categories={initialCategories}
        products={initialProducts}
        offers={initialOffers ?? []}
        reviews={reviews ?? []}
        posts={posts ?? []}
        useCases={useCases ?? []}
      />
    </Suspense>
  );
}

function HomeContent({
  categories,
  products,
  offers,
  reviews,
  posts,
  useCases
}: {
  categories: Category[];
  products: Product[];
  offers: Product[];
  reviews: FeaturedReview[];
  posts: BlogPost[];
  useCases: LandingPage[];
}) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilterState>(defaultFilters);
  const searchParams = useSearchParams();

  useEffect(() => {
    const initial = searchParams.get("category");
    if (initial) setActiveCategory(initial);

    // Arriving from the header/bottom-nav search (or a shared search
    // link) — prefill the shop search box with it.
    const q = searchParams.get("q");
    if (q) setSearch(q);

    const ref = searchParams.get("ref");
    if (ref) {
      try {
        localStorage.setItem("db_referral_code", ref.toUpperCase());
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  const availablePackSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach((p) => productPackSizes(p).forEach((s) => sizes.add(s)));
    return Array.from(sizes).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const min = parseFloat(filters.minPrice);
    const max = parseFloat(filters.maxPrice);
    const result = products.filter((p) => {
      const matchCat = activeCategory === "all" || p.category_id === activeCategory;
      const term = search.trim().toLowerCase();
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.name_odia.includes(term) ||
        p.category_id.includes(term) ||
        (p.description ?? "").toLowerCase().includes(term) ||
        productPackSizes(p).some((s) => s.toLowerCase().includes(term));

      const { min: priceMin, max: priceMax } = effectivePriceRange(p);
      const matchMinPrice = isNaN(min) || priceMax >= min;
      const matchMaxPrice = isNaN(max) || priceMin <= max;

      const matchPackSize =
        filters.packSizes.length === 0 || productPackSizes(p).some((s) => filters.packSizes.includes(s));

      const matchStock = !filters.inStockOnly || productInStock(p);

      const matchRating = filters.minRating === 0 || (p.avg_rating ?? 0) >= filters.minRating;

      return matchCat && matchSearch && matchMinPrice && matchMaxPrice && matchPackSize && matchStock && matchRating;
    });

    if (filters.sort === "price-asc") {
      result.sort((a, b) => effectivePriceRange(a).min - effectivePriceRange(b).min);
    } else if (filters.sort === "price-desc") {
      result.sort((a, b) => effectivePriceRange(b).min - effectivePriceRange(a).min);
    } else if (filters.sort === "rating") {
      result.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
    }

    return result;
  }, [products, activeCategory, search, filters]);

  return (
    <>
      <Header categories={categories} />

      <Hero products={products} />

      <Marquee />

      <LazyMount>
        <HeritagePantry categories={categories} products={products} />
      </LazyMount>

      <CategoryShowcase categories={categories} products={products} />

      <LazyMount>
        <OilTurntable categories={categories} products={products} />
      </LazyMount>

      <CustomerFavourites products={products} />

      <BrandStory products={products} />

      <ShopByNeed pages={useCases} products={products} />

      <PantryFlow categories={categories} products={products} />

      <Statement />

      <DailyOffers offers={offers} />

      <section id="shop" className="section-pad bg-cream">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="The full range"
              title={t("fullItemList")}
              action={
                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-[12.5px] text-ink-soft">
                    {filtered.length} item{filtered.length === 1 ? "" : "s"}
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="w-full border border-line bg-card px-4 py-2.5 text-sm focus:outline-none focus:border-ink sm:w-56"
                  />
                  <button
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    className={`whitespace-nowrap px-4 py-2.5 text-[12.5px] font-semibold ${
                      filtersOpen || isFilterActive(filters)
                        ? "border border-ink bg-ink text-cream"
                        : "border border-line text-ink-soft hover:border-ink"
                    }`}
                  >
                    Filters{isFilterActive(filters) ? " •" : ""}
                  </button>
                </div>
              }
            />
          </Reveal>

          <CategoryStrip categories={categories} active={activeCategory} onSelect={setActiveCategory} />
          <div className="h-6" />

          <ProductFilters
            open={filtersOpen}
            filters={filters}
            onChange={setFilters}
            availablePackSizes={availablePackSizes}
          />
          <ProductGrid products={filtered} loading={false} />
        </Container>
      </section>

      <TrustSection reviews={reviews} />

      <RecipesPreview posts={posts} />

      <NewsletterCTA />

      <Footer />
    </>
  );
}
