"use client";

import Link from "next/link";

// Friendly fallback if something fails while rendering a page. Nothing about
// the cart or any order is lost — those are stored separately.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-[30px] font-semibold text-ink md:text-[38px]">Something went wrong.</h1>
      <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-ink-soft">
        That didn&apos;t load as expected. Your cart is safe — please try again.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Back to home
        </Link>
      </div>
    </div>
  );
}
