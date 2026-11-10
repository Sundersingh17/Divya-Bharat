"use client";

import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/returns", label: "Returns" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/questions", label: "Q&A" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/certificates", label: "Certificates" },
  { href: "/admin/landing-pages", label: "Landing Pages" },
  { href: "/admin/delivery", label: "Delivery" },
  { href: "/admin/health", label: "Health" },
  { href: "/admin/newsletter", label: "Newsletter" },
  { href: "/admin/staff", label: "Staff" }
];

export default function AdminNav({ active }: { active: string }) {
  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full transition-colors ${
            active === tab.href
              ? "bg-ink text-cream"
              : "border border-line text-ink-soft hover:border-gold"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
