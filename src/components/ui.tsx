"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StarDisplay } from "./StarRating";

/* ------------------------------------------------------------------ */
/* Container / Divider                                                 */
/* ------------------------------------------------------------------ */

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`container-page ${className}`}>{children}</div>;
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`divider ${className}`} role="separator" />;
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "primary" | "dark" | "secondary" | "light";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
};

const VARIANT_CLASS = {
  primary: "btn-primary",
  dark: "btn-dark",
  secondary: "btn-secondary",
  light: "btn-light"
};

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  ariaLabel
}: ButtonProps) {
  const cls = `${VARIANT_CLASS[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

export function SecondaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button {...props} variant="secondary" />;
}

/* ------------------------------------------------------------------ */
/* Badge / Pill                                                        */
/* ------------------------------------------------------------------ */

export function Badge({
  children,
  tone = "ink",
  className = ""
}: {
  children: React.ReactNode;
  tone?: "ink" | "turmeric" | "leaf";
  className?: string;
}) {
  const t = tone === "turmeric" ? "badge-turmeric" : tone === "leaf" ? "badge-leaf" : "badge";
  return <span className={`${t} ${className}`}>{children}</span>;
}

export function Pill({
  children,
  active,
  onClick,
  className = ""
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`pill ${active ? "pill-active" : ""} ${className}`}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */

// Three deliberately different voices, so sections don't read as one
// repeated card:
//   commerce  - eyebrow + heading + subtitle (default; product areas)
//   editorial - big left-aligned headline, no eyebrow stack (storytelling)
//   statement - huge display type (the quiet brand moments)
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  action,
  invert,
  variant = "commerce"
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  action?: React.ReactNode;
  invert?: boolean;
  variant?: "commerce" | "editorial" | "statement";
}) {
  const centered = align === "center";
  const wrap = `mb-7 md:mb-9 flex flex-col gap-3 ${
    centered ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"
  }`;

  if (variant === "editorial") {
    return (
      <div className={wrap}>
        <div className={centered ? "max-w-3xl" : "max-w-2xl"}>
          <h2
            className={`font-serif font-semibold leading-[1.04] tracking-[-0.02em] text-[32px] sm:text-[40px] md:text-[48px] ${
              invert ? "text-warm" : "text-ink"
            }`}
          >
            {title}
          </h2>
          {(eyebrow || subtitle) && (
            <p className={`mt-3 text-[13px] md:text-[14px] ${invert ? "text-warm/70" : "text-ink-soft"}`}>
              {eyebrow && (
                <span className={`mr-3 text-[11px] font-semibold uppercase tracking-eyebrow ${invert ? "text-turmeric" : "text-red"}`}>
                  {eyebrow}
                </span>
              )}
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    );
  }

  if (variant === "statement") {
    return (
      <div className={`mb-10 ${centered ? "text-center" : ""}`}>
        <h2 className={`heading-statement ${invert ? "!text-warm" : ""}`}>{title}</h2>
        {subtitle && <p className={`mt-6 text-[13px] uppercase tracking-eyebrow ${invert ? "text-warm/60" : "text-ink-soft"}`}>{subtitle}</p>}
      </div>
    );
  }

  return (
    <div className={wrap}>
      <div className={centered ? "max-w-2xl" : "max-w-xl"}>
        {eyebrow && <div className={`eyebrow mb-3 ${invert ? "!text-turmeric" : ""}`}>{eyebrow}</div>}
        <h2 className={`heading-section ${invert ? "!text-warm" : ""}`}>{title}</h2>
        {subtitle && (
          <p className={`mt-2.5 text-[13px] leading-relaxed md:text-[14px] ${invert ? "text-warm/75" : "text-ink-soft"}`}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Price / Rating / TrustItem                                          */
/* ------------------------------------------------------------------ */

// Deliberately sans + tabular numerals — the brief reserves monospace for
// batch numbers and SKUs, not for everyday prices.
export function Price({
  price,
  mrp,
  size = "md"
}: {
  price: number;
  mrp?: number;
  size?: "sm" | "md" | "lg";
}) {
  const main = size === "lg" ? "text-[28px]" : size === "sm" ? "text-[14px]" : "text-[16px]";
  return (
    <div className="flex items-baseline gap-2">
      <span className={`price ${main}`}>₹{price}</span>
      {mrp !== undefined && mrp > price && (
        <span className="text-[12px] text-ink-soft/70 line-through tabular-nums">₹{mrp}</span>
      )}
    </div>
  );
}

export function Rating({ value, count, size = "text-[11px]" }: { value: number | null; count?: number; size?: string }) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-1.5">
      <StarDisplay rating={value} size={size} />
      {count !== undefined && <span className="text-[11px] text-ink-soft">({count})</span>}
    </div>
  );
}

export function TrustItem({
  icon,
  title,
  text,
  invert
}: {
  icon: string;
  title: string;
  text?: string;
  invert?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <i
        className={`ti ${icon} mt-0.5 text-[20px] ${invert ? "text-turmeric" : "text-red"}`}
        aria-hidden="true"
      />
      <div>
        <div className={`text-[13px] font-semibold ${invert ? "text-warm" : "text-ink"}`}>{title}</div>
        {text && <div className={`text-[12px] leading-relaxed ${invert ? "text-warm/70" : "text-ink-soft"}`}>{text}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reveal — fades/slides content in once as it scrolls into view       */
/* ------------------------------------------------------------------ */

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  clip = false
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
  clip?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as any}
      className={`${clip ? "clip-reveal" : "reveal"} ${visible ? "is-visible" : ""} ${className}`}
      style={{ ["--reveal-delay" as any]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}


/* ------------------------------------------------------------------ */
/* Accordion: native <details>, so it is keyboard and screen-reader     */
/* accessible with zero JavaScript                                      */
/* ------------------------------------------------------------------ */

export function Accordion({
  title,
  children,
  defaultOpen = false
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group border-t border-line last:border-b" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[13px] font-semibold uppercase tracking-[.1em] text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <i className="ti ti-plus text-[16px] transition-transform duration-base ease-brand group-open:rotate-45" aria-hidden="true" />
      </summary>
      <div className="pb-6 text-[14px] leading-7 text-ink-soft">{children}</div>
    </details>
  );
}


/* ------------------------------------------------------------------ */
/* EmptyState: one voice for every "nothing here yet" moment            */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title,
  text,
  ctaLabel,
  ctaHref,
  onCta,
  compact
}: {
  title: string;
  text?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-10" : "py-20"}`}>
      <h3 className="font-serif text-[26px] font-semibold uppercase leading-[1.05] tracking-tight text-ink md:text-[32px]">
        {title}
      </h3>
      {text && <p className="mt-3 max-w-[300px] text-[13.5px] leading-relaxed text-ink-soft">{text}</p>}
      {ctaLabel && (ctaHref ? (
        <Link href={ctaHref} onClick={onCta} className="btn-primary mt-7">
          {ctaLabel}
          <i className="ti ti-arrow-right text-[15px]" aria-hidden="true" />
        </Link>
      ) : (
        <button onClick={onCta} className="btn-primary mt-7">
          {ctaLabel}
        </button>
      ))}
    </div>
  );
}
