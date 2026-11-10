"use client";

export type SortOption = "relevance" | "price-asc" | "price-desc" | "rating";

export type ProductFilterState = {
  sort: SortOption;
  minPrice: string;
  maxPrice: string;
  packSizes: string[];
  inStockOnly: boolean;
  minRating: number; // 0 = any
};

export const defaultFilters: ProductFilterState = {
  sort: "relevance",
  minPrice: "",
  maxPrice: "",
  packSizes: [],
  inStockOnly: false,
  minRating: 0
};

export function isFilterActive(f: ProductFilterState): boolean {
  return (
    f.sort !== "relevance" ||
    !!f.minPrice ||
    !!f.maxPrice ||
    f.packSizes.length > 0 ||
    f.inStockOnly ||
    f.minRating > 0
  );
}

export default function ProductFilters({
  open,
  filters,
  onChange,
  availablePackSizes
}: {
  open: boolean;
  filters: ProductFilterState;
  onChange: (next: ProductFilterState) => void;
  availablePackSizes: string[];
}) {
  if (!open) return null;

  function togglePackSize(size: string) {
    const has = filters.packSizes.includes(size);
    onChange({
      ...filters,
      packSizes: has ? filters.packSizes.filter((s) => s !== size) : [...filters.packSizes, size]
    });
  }

  return (
    <div className="bg-warm px-5 py-5 mb-6 flex flex-wrap gap-6">
      <div>
        <div className="text-[11px] font-semibold text-ink-soft mb-1.5 uppercase tracking-wide">Price (₹)</div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => onChange({ ...filters, minPrice: e.target.value })}
            placeholder="Min"
            className="w-20 border border-line px-2.5 py-1.5 text-[12.5px] bg-cream"
          />
          <span className="text-ink-soft text-[12px]">–</span>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
            placeholder="Max"
            className="w-20 border border-line px-2.5 py-1.5 text-[12.5px] bg-cream"
          />
        </div>
      </div>

      {availablePackSizes.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-ink-soft mb-1.5 uppercase tracking-wide">Pack size</div>
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {availablePackSizes.map((size) => (
              <button
                key={size}
                onClick={() => togglePackSize(size)}
                className={`text-[11.5px] px-2.5 py-1 border ${
                  filters.packSizes.includes(size)
                    ? "bg-red text-[#FBF6EE] border-red"
                    : "border-line text-ink-soft hover:border-gold"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[11px] font-semibold text-ink-soft mb-1.5 uppercase tracking-wide">Rating</div>
        <select
          value={filters.minRating}
          onChange={(e) => onChange({ ...filters, minRating: parseFloat(e.target.value) })}
          className="border border-line px-2.5 py-1.5 text-[12.5px] bg-cream"
        >
          <option value={0}>Any rating</option>
          <option value={4}>4★ &amp; up</option>
          <option value={3}>3★ &amp; up</option>
        </select>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-ink-soft mb-1.5 uppercase tracking-wide">Availability</div>
        <label className="flex items-center gap-1.5 text-[12.5px] text-ink-soft py-1.5">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => onChange({ ...filters, inStockOnly: e.target.checked })}
          />
          In stock only
        </label>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-ink-soft mb-1.5 uppercase tracking-wide">Sort by</div>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as SortOption })}
          className="border border-line px-2.5 py-1.5 text-[12.5px] bg-cream"
        >
          <option value="relevance">Relevance</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Highest rated</option>
        </select>
      </div>

      {isFilterActive(filters) && (
        <button
          onClick={() => onChange(defaultFilters)}
          className="self-end text-[11.5px] text-red-dark underline mb-1.5"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
