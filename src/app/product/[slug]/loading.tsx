// Product page skeleton: gallery on the left, details on the right, so the
// layout does not jump when the real page arrives.
export default function Loading() {
  const shimmer = "bg-gradient-to-r from-cream-2 via-[#F7F2E9] to-cream-2 bg-[length:640px_100%] animate-shimmer";
  return (
    <div aria-busy="true" aria-label="Loading product">
      <div className="h-[34px] bg-leaf" />
      <div className="h-[88px] border-b border-line bg-cream" />
      <div className="container-page grid gap-10 py-10 md:grid-cols-2 md:py-16">
        <div>
          <div className={`aspect-square w-full ${shimmer}`} />
          <div className="mt-3 flex gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-16 w-16 ${shimmer}`} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className={`h-3 w-24 ${shimmer}`} />
          <div className={`h-10 w-3/4 ${shimmer}`} />
          <div className={`h-4 w-1/3 ${shimmer}`} />
          <div className={`h-8 w-28 ${shimmer}`} />
          <div className="flex gap-2 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-11 w-20 ${shimmer}`} />
            ))}
          </div>
          <div className={`h-14 w-full ${shimmer}`} />
          <div className={`h-24 w-full ${shimmer}`} />
        </div>
      </div>
    </div>
  );
}
