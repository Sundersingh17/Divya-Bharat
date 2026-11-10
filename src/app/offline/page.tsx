import type { Metadata } from "next";

export const metadata: Metadata = { title: "You're offline | Divya Bharat", robots: { index: false } };

// Shown by the service worker when a page can't be reached. Plain markup on
// purpose (a normal link, no scripts) so it works with no connection.
export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-[30px] font-semibold text-ink md:text-[38px]">You&apos;re offline.</h1>
      <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-ink-soft">
        Check your internet connection and try again. Your cart is saved on this device.
      </p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="btn-primary mt-6">
        Try again
      </a>
    </div>
  );
}
