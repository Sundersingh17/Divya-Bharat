"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUI } from "@/context/UIContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { count } = useCart();
  const { openCart, openSearch } = useUI();

  const item = "relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium";
  const tone = (active: boolean) => (active ? "text-red" : "text-ink-soft");

  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-[90] flex border-t border-line bg-warm/95 backdrop-blur md:hidden"
    >
      <Link href="/" className={`${item} ${tone(pathname === "/")}`}>
        <i className="ti ti-home-2 text-[21px]" aria-hidden="true" />
        Home
      </Link>
      <Link href="/collections" className={`${item} ${tone(pathname.startsWith("/collections") || pathname.startsWith("/use-case"))}`}>
        <i className="ti ti-layout-grid text-[21px]" aria-hidden="true" />
        Categories
      </Link>
      <button onClick={openSearch} className={`${item} ${tone(false)}`}>
        <i className="ti ti-search text-[21px]" aria-hidden="true" />
        Search
      </button>
      <button onClick={openCart} className={`${item} ${tone(false)}`}>
        <span className="relative">
          <i className="ti ti-shopping-bag text-[21px]" aria-hidden="true" />
          {count > 0 && (
            <span className="absolute -right-2.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red px-1 text-[9px] font-bold text-warm">
              {count}
            </span>
          )}
        </span>
        Cart
      </button>
      <Link href="/account" className={`${item} ${tone(pathname.startsWith("/account"))}`}>
        <i className="ti ti-user text-[21px]" aria-hidden="true" />
        Account
      </Link>
    </nav>
  );
}
