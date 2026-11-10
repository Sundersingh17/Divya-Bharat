"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

const WA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
const IG = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
const MAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { href: "/collections", label: "All products" },
      { href: "/use-case", label: "Shop by need" },
      { href: "/offers", label: "Offers & combo kits" },
      { href: "/blog", label: "Recipes & guides" }
    ]
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About & quality" },
      { href: "/membership", label: "Divya Bharat Club" }
    ]
  },
  {
    title: "Help",
    links: [
      { href: "/help", label: "Help centre" },
      { href: "/help#faq", label: "FAQ" },
      { href: "/help#contact", label: "Contact" },
      { href: "/orders", label: "Track an order" },
      { href: "/account", label: "My account" }
    ]
  },
  {
    title: "Legal",
    links: [
      { href: "/help#shipping", label: "Shipping" },
      { href: "/help#returns", label: "Returns & refunds" },
      { href: "/help#privacy", label: "Privacy" },
      { href: "/help#terms", label: "Terms" }
    ]
  }
];

export default function Footer() {
  const { t } = useLanguage();
  const socialClass =
    "flex items-center gap-2 border border-warm/25 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[.1em] text-warm hover:border-turmeric hover:text-turmeric";

  return (
    <footer className="grain relative bg-ink text-warm/70">
      <div className="container-page pb-8 pt-14 md:pt-20">
        <div className="flex items-center gap-5 md:gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-512.png" alt="Divya Bharat Food Processing Centre, Odisha" width={120} height={120} loading="lazy" className="h-16 w-16 flex-shrink-0 md:h-28 md:w-28" />
          <div className="font-serif text-[11vw] font-bold uppercase leading-[.88] tracking-[-0.02em] text-warm md:text-[length:min(7vw,96px)]">
            Divya Bharat
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <p className="font-serif text-[22px] font-semibold uppercase leading-tight tracking-tight text-turmeric md:text-[30px]">
            From Odisha.
            <br />
            For everyday kitchens.
          </p>
          <div className="flex flex-wrap gap-3">
            {IG && (
              <a href={IG} target="_blank" rel="noopener noreferrer" className={socialClass}>
                <i className="ti ti-brand-instagram text-[16px]" aria-hidden="true" />
                Instagram
              </a>
            )}
            {WA && (
              <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer" className={socialClass}>
                <i className="ti ti-brand-whatsapp text-[16px]" aria-hidden="true" />
                WhatsApp
              </a>
            )}
            {MAIL && (
              <a href={`mailto:${MAIL}`} className={socialClass}>
                <i className="ti ti-mail text-[16px]" aria-hidden="true" />
                Email
              </a>
            )}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-8">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[.18em] text-warm">{col.title}</h4>
              <ul className="space-y-2.5 text-[13px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-turmeric">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-10 max-w-md text-[12px] leading-relaxed text-warm/50">{t("footerTagline")}</p>

        <div className="mt-8 flex flex-col gap-2 border-t border-warm/10 pt-6 text-[11.5px] text-warm/50 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Divya Bharat · Made in Odisha</span>
          <span className="flex items-center gap-4">
            {process.env.NEXT_PUBLIC_FSSAI_LICENSE_NUMBER
              ? `FSSAI license: ${process.env.NEXT_PUBLIC_FSSAI_LICENSE_NUMBER}`
              : "FSSAI license: to be added before public launch"}
            <Link href="/admin" className="opacity-50 hover:opacity-100">
              Admin
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
