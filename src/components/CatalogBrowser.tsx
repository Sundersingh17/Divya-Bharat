"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CategoryStrip from "@/components/CategoryStrip";
import ProductGrid from "@/components/ProductGrid";
import ProductFilters, {
  defaultFilters,
  isFilterActive,
  ProductFilterState,
  SortOption
} from "@/components/ProductFilters";
import { EmptyState } from "@/components/ui";
import { effectivePriceRange, productInStock, productPackSizes } from "@/lib/pricing";
import { Category, Product } from "@/lib/types";

const PAGE_SIZE = 12;
const SORTS: SortOption[] = ["relevance", "price-asc", "price-desc", "rating"];

type Props = {
  products: Product[];
  categories: Category[];
  fixedCategory?: string;
  basePath: string;
};

export default function CatalogBrowser(props: Props) {
  return (
    <Suspense fallback={<ProductGrid products={[]} loading />}>
      <CatalogContent {...props} />
    </Suspense>
  );
}

function CatalogContent({ products, categories, fixedCategory, basePath }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSort = searchParams.get("sort") as SortOption | null;
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState(fixedCategory ?? searchParams.get("category") ?? "all");
  const [filters, setFilters] = useState<ProductFilterState>({
    ...defaultFilters,
    sort: initialSort && SORTS.includes(initialSort) ? initialSort : "relevance"
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Keep the URL shareable: q, category and sort only (other filters stay local).
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (!fixedCategory && activeCategory !== "all") params.set("category", activeCategory);
    if (filters.sort !== "relevance") params.set("sort", filters.sort);
    const qs = params.toString();
    const target = qs ? `${basePath}?${qs}` : basePath;
    const current = searchParams.toString();
    if ((qs || "") !== current && pathname === basePath) {
      router.replace(target, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeCategory, filters.sort]);

  // Any change to the result set restarts pagination.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, activeCategory, filters]);

  const scoped = useMemo(
    () => (fixedCategory ? products.filter((p) => p.category_id === fixedCategory) : products),
    [products, fixedCategory]
  );

  const availablePackSizes = useMemo(() => {
    const sizes = new Set<string>();
    scoped.forEach((p) => productPackSizes(p).forEach((s) => sizes.add(s)));
    return Array.from(sizes).sort();
  }, [scoped]);

  const filtered = useMemo(() => {
    const min = parseFloat(filters.minPrice);
    const max = parseFloat(filters.maxPrice);
    const term = search.trim().toLowerCase();
    const result = scoped.filter((p) => {
      const matchCat = fixedCategory || activeCategory === "all" || p.category_id === activeCategory;
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.name_odia.includes(term) ||
        p.category_id.includes(term) ||
        (p.description ?? "").toLowerCase().includes(term) ||
        productPackSizes(p).some((s) => s.toLowerCase().includes(term));
      const { min: priceMin, max: priceMax } = effectivePriceRange(p);
      const matchMin = isNaN(min) || priceMax >= min;
      const matchMax = isNaN(max) || priceMin <= max;
      const matchPack =
        filters.packSizes.length === 0 || productPackSizes(p).some((s) => filters.packSizes.includes(s));
      const matchStock = !filters.inStockOnly || productInStock(p);
      const matchRating = filters.minRating === 0 || (p.avg_rating ?? 0) >= filters.minRating;
      return !!matchCat && matchSearch && matchMin && matchMax && matchPack && matchStock && matchRating;
    });

    if (filters.sort === "price-asc") {
      result.sort((a, b) => effectivePriceRange(a).min - effectivePriceRange(b).min);
    } else if (filters.sort === "price-desc") {
      result.sort((a, b) => effectivePriceRange(b).min - effectivePriceRange(a).min);
    } else if (filters.sort === "rating") {
      result.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
    }
    return result;
  }, [scoped, search, activeCategory, filters, fixedCategory]);

  const visible = filtered.slice(0, visibleCount);
  const anyActive = isFilterActive(filters) || !!search.trim() || (!fixedCategory && activeCategory !== "all");

  function clearAll() {
    setSearch("");
    setFilters(defaultFilters);
    if (!fixedCategory) setActiveCategory("all");
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search oils, dal, spices…"
          aria-label="Search products"
          className="w-full border border-line bg-card px-4 py-2.5 text-sm focus:border-ink focus:outline-none sm:max-w-sm"
        />
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
          className={`whitespace-nowrap px-4 py-2.5 text-[12.5px] font-semibold ${
            filtersOpen || isFilterActive(filters)
              ? "border border-ink bg-ink text-cream"
              : "border border-line text-ink-soft hover:border-ink"
          }`}
        >
          Filters &amp; sort{isFilterActive(filters) ? " •" : ""}
        </button>
        <span className="text-[12.5px] text-ink-soft sm:ml-auto" aria-live="polite">
          Showing {Math.min(visible.length, filtered.length)} of {filtered.length}
          {filtered.length !== scoped.length ? ` (${scoped.length} total)` : ""}
        </span>
      </div>

      {!fixedCategory && (
        <div className="-mx-5 mb-6">
          <CategoryStrip categories={categories} active={activeCategory} onSelect={setActiveCategory} />
        </div>
      )}

      <ProductFilters
        open={filtersOpen}
        filters={filters}
        onChange={setFilters}
        availablePackSizes={availablePackSizes}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={scoped.length === 0 ? "This shelf is being stocked." : "Nothing matches that, yet."}
          text={
            scoped.length === 0
              ? "Products for this category are coming soon."
              : "Try a different name, or clear your filters."
          }
          ctaLabel={anyActive ? "Clear filters" : undefined}
          onCta={anyActive ? clearAll : undefined}
        />
      ) : (
        <>
          <ProductGrid products={visible} loading={false} />
          {visible.length < filtered.length && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="border border-ink px-6 py-3 text-[13px] font-semibold text-ink hover:bg-ink hover:text-cream"
              >
                Show more ({filtered.length - visible.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
