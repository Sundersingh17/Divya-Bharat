"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import CartDrawer from "@/components/CartDrawer";
import { SearchOverlay } from "@/components/Search";
import MobileBottomNav from "@/components/MobileBottomNav";

// One global home for the site's overlays. Before this, only the home and
// product pages rendered a cart drawer, so the cart button on every other
// page (blog, collections, returns…) did nothing. Now the header, the
// mobile bottom nav and any page can open the same drawer/search.
type UIState = {
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const UIContext = createContext<UIState | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Close overlays on navigation so they never linger over a new page.
  useEffect(() => {
    setCartOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  // The bottom nav is a storefront affordance — admin and checkout stay clean.
  const showNav = !pathname.startsWith("/admin") && !pathname.startsWith("/checkout");

  return (
    <UIContext.Provider value={{ cartOpen, openCart, closeCart, searchOpen, openSearch, closeSearch }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-ink focus:px-4 focus:py-3 focus:text-[13px] focus:font-semibold focus:text-warm"
      >
        Skip to content
      </a>
      <div id="main" tabIndex={-1} className={`outline-none ${showNav ? "pb-[68px] md:pb-0" : ""}`}>
        {children}
      </div>
      <CartDrawer open={cartOpen} onClose={closeCart} />
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
      {showNav && <MobileBottomNav />}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside UIProvider");
  return ctx;
}
