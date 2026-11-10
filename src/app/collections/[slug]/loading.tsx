import ProductGrid from "@/components/ProductGrid";

// Collection / use-case skeleton: hero block, heading block, then the
// product grid, matching LandingPageView's geometry.
export default function Loading() {
  const shimmer = "bg-gradient-to-r from-cream-2 via-[#F7F2E9] to-cream-2 bg-[length:640px_100%] animate-shimmer";
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-[34px] bg-leaf" />
      <div className="h-[88px] border-b border-line bg-cream" />
      <div className={`h-[46vh] min-h-[280px] ${shimmer}`} />
      <div className="container-page py-16">
        <div className={`mb-10 h-4 w-40 ${shimmer}`} />
        <ProductGrid products={[]} loading />
      </div>
    </div>
  );
}
