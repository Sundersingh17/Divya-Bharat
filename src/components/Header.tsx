"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useUI } from "@/context/UIContext";
import { SearchBox } from "./Search";
import { Category } from "@/lib/types";

const CATEGORY_NAV = [
  { href: "/collections", label: "Shop" },
  { href: "/use-case", label: "Shop by Need" },
  { href: "/offers", label: "Offers & Combo Kits" },
  { href: "/blog", label: "Recipes" },
  { href: "/about", label: "Our Story" },
  { href: "/membership", label: "Divya Bharat Club" }
];

const UTILITY_NAV = [
  { href: "/orders", label: "Track Order" },
  { href: "/help", label: "Help" }
];

// `categories` and `onOpenCart` are accepted so existing call sites keep
// compiling; the header now sources both from the global UI layer.
export default function Header(_props: { categories?: Category[]; onOpenCart?: () => void }) {
  const { count } = useCart();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { openCart, openSearch } = useUI();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (count === 0) return;
    setBump(true);
    const timer = setTimeout(() => setBump(false), 320);
    return () => clearTimeout(timer);
  }, [count]);

  const iconBtn =
    "relative flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-red";

  return (
    <>
      <div className="bg-leaf px-3 py-2 text-center text-[11.5px] font-medium tracking-wide text-warm/90">
        Cold-pressed in Odisha · Free delivery over ₹499 · Shipped pan-India
      </div>

      <header
        className={`sticky top-0 z-40 border-b bg-cream/95 backdrop-blur transition-shadow duration-300 ${
          scrolled ? "border-transparent shadow-md" : "border-line"
        }`}
      >
        <div
          className={`container-page flex items-center gap-4 transition-[height] duration-300 md:gap-8 ${
            scrolled ? "h-14 md:h-[60px]" : "h-16 md:h-[78px]"
          }`}
        >
          <Link href="/" className="flex flex-shrink-0 items-center gap-3" aria-label="Divya Bharat — home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-512.png"
              alt=""
              width={44}
              height={44}
              className={`flex-shrink-0 transition-all duration-300 ${scrolled ? "h-9 w-9" : "h-10 w-10 md:h-12 md:w-12"}`}
            />
            <span className="leading-none">
              <span className="block font-serif text-[21px] font-bold tracking-[.08em] text-ink md:text-[25px]">
                DIVYA BHARAT
              </span>
              <span
                className={`hidden text-[9px] font-medium uppercase tracking-[.2em] text-ink-soft transition-all duration-300 md:block ${
                  scrolled ? "mt-0 max-h-0 opacity-0" : "mt-1.5 max-h-4 opacity-100"
                }`}
              >
                Food Processing Centre
              </span>
            </span>
          </Link>

          <div className="mx-auto hidden w-full max-w-[520px] flex-1 md:block">
            <SearchBox />
          </div>

          <div className="ml-auto flex flex-shrink-0 items-center md:ml-0">
            <button
              onClick={() => setLanguage(language === "en" ? "or" : "en")}
              className="flex h-10 w-10 items-center justify-center text-[11px] font-semibold text-ink-soft transition-colors hover:text-ink"
              aria-label="Toggle language"
              title={language === "en" ? "ଓଡ଼ିଆ" : "English"}
            >
              {language === "en" ? "ଓଡ଼ି" : "EN"}
            </button>
            <button onClick={openSearch} className={`${iconBtn} md:hidden`} aria-label="Search">
              <i className="ti ti-search text-[20px]" aria-hidden="true" />
            </button>
            <Link
              href="/membership"
              className={`${iconBtn} hidden text-gold hover:text-red lg:flex`}
              aria-label={t("club")}
              title={t("club")}
            >
              <i className="ti ti-crown text-[19px]" aria-hidden="true" />
            </Link>
            <Link
              href="/account?view=wishlist"
              className={`${iconBtn} hidden md:flex`}
              aria-label="Wishlist"
              title="Wishlist"
            >
              <i className="ti ti-heart text-[19px]" aria-hidden="true" />
            </Link>
            <Link
              href="/account"
              className={`${iconBtn} hidden md:flex`}
              aria-label={user ? t("account") : t("signIn")}
              title={user ? t("account") : t("signIn")}
            >
              <i className="ti ti-user text-[19px]" aria-hidden="true" />
            </Link>
            <button onClick={openCart} className={iconBtn} aria-label={t("cart")} title={t("cart")}>
              <i className="ti ti-shopping-bag text-[20px]" aria-hidden="true" />
              {count > 0 && (
                <span
                  className={`absolute right-0.5 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-warm ${
                    bump ? "animate-bump" : ""
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Category navigation — scrolls horizontally on mobile. */}
        <div>
          <nav
            aria-label="Main"
            className="container-page scrollbar-none flex items-center gap-6 overflow-x-auto whitespace-nowrap md:gap-7"
          >
            {CATEGORY_NAV.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`border-b-[2px] py-3 text-[12px] font-semibold uppercase tracking-[.09em] transition-colors ${
                    active
                      ? "border-red text-red"
                      : "border-transparent text-ink-soft hover:border-ink/30 hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="ml-auto hidden items-center gap-6 pl-6 lg:flex">
              {UTILITY_NAV.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-3 text-[12px] font-medium transition-colors ${
                    pathname.startsWith(link.href) ? "text-red" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
