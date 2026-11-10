"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Accordion } from "@/components/ui";
import { FREE_SHIP_THRESHOLD, SHIPPING_FEE } from "@/lib/shipping";
import { MEMBERSHIP_DISCOUNT_PCT, MEMBERSHIP_PLANS } from "@/lib/membership";

const WA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
const IG = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
const MAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const FSSAI = process.env.NEXT_PUBLIC_FSSAI_LICENSE_NUMBER;

const TABS = [
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
  { id: "shipping", label: "Shipping" },
  { id: "returns", label: "Cancellation & returns" },
  { id: "order-support", label: "Order support" },
  { id: "privacy", label: "Privacy" },
  { id: "terms", label: "Terms" }
] as const;
type TabId = (typeof TABS)[number]["id"];

function Draft() {
  return (
    <p className="mb-5 border border-gold-soft bg-[#FBF3E0] px-4 py-3 text-[12.5px] text-ink">
      Draft — to be reviewed and finalised by the business (and legal advice where needed) before public launch.
    </p>
  );
}

export default function HelpTabs() {
  const [tab, setTab] = useState<TabId>("faq");

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace("#", "") as TabId;
      if (TABS.some((t) => t.id === h)) setTab(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  function select(id: TabId) {
    setTab(id);
    try {
      history.replaceState(null, "", `#${id}`);
    } catch {}
  }

  return (
    <div>
      <div role="tablist" aria-label="Help topics" className="scrollbar-none mb-8 flex gap-6 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => select(t.id)}
            className={`flex-shrink-0 border-b-2 pb-3 text-[13px] font-semibold tracking-wide transition-colors ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="max-w-2xl text-[14px] leading-7 text-ink-soft">
        {tab === "faq" && (
          <div>
            <Accordion title="How do I place an order?" defaultOpen>
              Add items to your cart, then sign in with a phone or email one-time code at checkout. An account is required to place an order.
            </Accordion>
            <Accordion title="How can I pay?">
              Pay online (UPI, card or netbanking via Razorpay) or choose cash on delivery.
            </Accordion>
            <Accordion title="How much is delivery?">
              Free on orders of ₹{FREE_SHIP_THRESHOLD} or more, otherwise a flat ₹{SHIPPING_FEE}. Divya Bharat Club members get free delivery.
            </Accordion>
            <Accordion title="How do I track my order?">
              Signed in, open <Link href="/account" className="text-red-dark underline">My account</Link> or <Link href="/orders" className="text-red-dark underline">Track order</Link>. Each stage (Placed, Packed, Shipped, Delivered) is dated as it happens.
            </Accordion>
            <Accordion title="What is Divya Bharat Club?">
              A paid membership: {MEMBERSHIP_DISCOUNT_PCT}% off and free delivery while active (
              {MEMBERSHIP_PLANS.map((p) => `${p.label} ₹${p.price}`).join(", ")}). See <Link href="/membership" className="text-red-dark underline">the Club page</Link>.
            </Accordion>
            <Accordion title="How do loyalty points work?">
              You earn 1 point per ₹20 spent. Points can be redeemed at checkout (1 point = ₹1), covering at most half of an order's subtotal. Points are reversed if an order is cancelled.
            </Accordion>
          </div>
        )}

        {tab === "contact" && (
          <div>
            <p className="mb-4">Reach us for questions about products, orders or deliveries.</p>
            {WA || IG || MAIL ? (
              <ul className="space-y-2">
                {WA && <li><a className="text-red-dark underline" href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer">WhatsApp us</a></li>}
                {MAIL && <li><a className="text-red-dark underline" href={`mailto:${MAIL}`}>{MAIL}</a></li>}
                {IG && <li><a className="text-red-dark underline" href={IG} target="_blank" rel="noopener noreferrer">Instagram</a></li>}
              </ul>
            ) : (
              <p>Contact details will be added before launch.</p>
            )}
            {FSSAI && <p className="mt-6 text-[12.5px]">FSSAI licence: {FSSAI}</p>}
          </div>
        )}

        {tab === "shipping" && (
          <div>
            <Draft />
            <p className="mb-3"><b className="text-ink">Delivery charge:</b> free above ₹{FREE_SHIP_THRESHOLD}, otherwise a flat ₹{SHIPPING_FEE}. Club members and free-shipping coupons waive the charge.</p>
            <p><b className="text-ink">Status updates:</b> orders move through Placed, Packed, Shipped and Delivered; we email you when the status changes (if you gave an email).</p>
            <p className="mt-3 text-[12.5px]">Delivery timelines and serviceable PIN codes will be listed here once confirmed by the business.</p>
          </div>
        )}

        {tab === "returns" && (
          <div>
            <Draft />
            <p className="mb-3"><b className="text-ink">Cancellation:</b> orders can be cancelled free of charge any time before they are marked “Packed”. Once packed, food items cannot be cancelled.</p>
            <p className="mb-3"><b className="text-ink">Returns:</b> accepted only for damaged packaging, wrong items or quality issues, reported within 48 hours of delivery with photos.</p>
            <p className="mb-5"><b className="text-ink">Refunds:</b> processed within 5–7 business days of an approved return.</p>
            <Link href="/returns" className="btn-primary">Request a return</Link>
          </div>
        )}

        {tab === "order-support" && (
          <div>
            <ul className="list-disc space-y-2 pl-5">
              <li>Check status: <Link href="/orders" className="text-red-dark underline">Track order</Link></li>
              <li>Invoices are available from My account and order lookup.</li>
              <li>Payment taken but no order shown? Keep your Razorpay payment ID and contact us (see Contact).</li>
              <li>Problem with an item: <Link href="/returns" className="text-red-dark underline">start a return request</Link>.</li>
            </ul>
          </div>
        )}

        {tab === "privacy" && (
          <div>
            <Draft />
            <p className="mb-3"><b className="text-ink">What we collect:</b> name, phone number and/or email (for sign-in and order updates), delivery addresses, and your orders, reviews, wishlist and loyalty activity.</p>
            <p className="mb-3"><b className="text-ink">How it is processed:</b> data is stored in Supabase; online payments are handled by Razorpay (we do not store card details); order emails are sent through Resend. Analytics (Google Analytics / Meta Pixel) load only if the business has enabled them.</p>
            <p><b className="text-ink">Your choices:</b> you can edit your profile and addresses in My account. To ask for your data to be corrected or removed, contact us.</p>
          </div>
        )}

        {tab === "terms" && (
          <div>
            <Draft />
            <p className="mb-3">By placing an order you confirm the details you provide are accurate. Prices are in INR and inclusive of applicable taxes as shown at checkout; the total shown at checkout is final.</p>
            <p className="mb-3">Product availability and prices can change; an order is confirmed only once you see the order confirmation page.</p>
            <p>Full terms and conditions will be provided by the business before launch.</p>
          </div>
        )}
      </div>
    </div>
  );
}
