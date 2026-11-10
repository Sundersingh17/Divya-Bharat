import ProductGrid from "@/components/ProductGrid";

// Branded skeleton shown while a route's data loads: the same geometry as
// the real hero + product grid, so nothing jumps when content arrives.
export default function Loading() {
  const shimmer = "bg-gradient-to-r from-cream-2 via-[#F7F2E9] to-cream-2 bg-[length:640px_100%] animate-shimmer";
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-[34px] bg-leaf" />
      <div className="h-[88px] border-b border-line bg-cream" />
      <div className="container-page grid grid-cols-1 gap-8 py-12 md:grid-cols-2 md:py-20">
        <div className="space-y-4">
          <div className={`h-3 w-32 ${shimmer}`} />
          <div className={`h-16 w-4/5 ${shimmer}`} />
          <div className={`h-16 w-3/5 ${shimmer}`} />
          <div className={`h-4 w-2/3 ${shimmer}`} />
        </div>
        <div className={`h-[320px] md:h-[480px] ${shimmer}`} />
      </div>
      <div className="container-page pb-20">
        <ProductGrid products={[]} loading />
      </div>
    </div>
  );
}
