"use client";

import { useEffect, useState } from "react";

// Premium fallback used whenever a product has no photo (or it fails to
// load). Each category gets its own tone, abstract ingredient shapes and
// its name set in serif over a faint paper grain — a designed "plate",
// not an emoji.
type Tone = { bg: string; shape: string; shape2: string; ink: string; label: string };

const CATEGORY_TONE: Record<string, Tone> = {
  oils: { bg: "#E9CF8A", shape: "#D2A13A", shape2: "#F3E2AE", ink: "#5B4310", label: "Cold-pressed oils" },
  chhatua: { bg: "#DCCDA4", shape: "#B99A5B", shape2: "#EDE2C3", ink: "#4E3F1E", label: "Chhatua" },
  flours: { bg: "#EADFC9", shape: "#CDB88F", shape2: "#F6EFE0", ink: "#5A4A2C", label: "Flours" },
  spices: { bg: "#DFA78F", shape: "#B94F32", shape2: "#EFC7B4", ink: "#5A2314", label: "Spices" },
  dal: { bg: "#C9CE9F", shape: "#8C9A5A", shape2: "#E1E4C2", ink: "#39421F", label: "Dal" },
  papad: { bg: "#EACFA6", shape: "#C99A54", shape2: "#F5E6C9", ink: "#5B3D14", label: "Papad" },
  bundles: { bg: "#B7C7AE", shape: "#304936", shape2: "#D7E1CF", ink: "#1F3324", label: "Gift hampers" },
  other: { bg: "#D9DEC7", shape: "#7A8B5E", shape2: "#ECEFDF", ink: "#3A4426", label: "Pantry" }
};

function CategoryShapes({ categoryId, tone }: { categoryId: string; tone: Tone }) {
  switch (categoryId) {
    case "oils":
      return (
        <g>
          <circle cx="150" cy="120" r="82" fill={tone.shape2} opacity=".7" />
          <path d="M150 58 C 118 104, 108 128, 108 148 a42 42 0 0 0 84 0 C192 128 182 104 150 58 Z" fill={tone.shape} />
          <path d="M132 150 a22 22 0 0 0 16 24" stroke={tone.shape2} strokeWidth="6" fill="none" strokeLinecap="round" opacity=".8" />
          <circle cx="232" cy="82" r="9" fill={tone.shape} opacity=".55" />
          <circle cx="72" cy="196" r="14" fill={tone.shape} opacity=".35" />
        </g>
      );
    case "chhatua":
    case "flours":
      return (
        <g>
          <ellipse cx="150" cy="190" rx="110" ry="46" fill={tone.shape2} opacity=".85" />
          <path d="M40 190 C 80 96, 220 96, 260 190 Z" fill={tone.shape} opacity=".9" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M${88 + i * 30} 96 q 6 -34 0 -60`}
              stroke={tone.shape}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              opacity=".55"
            />
          ))}
        </g>
      );
    case "spices":
      return (
        <g>
          <circle cx="110" cy="130" r="58" fill={tone.shape} opacity=".9" />
          <circle cx="196" cy="98" r="36" fill={tone.shape2} />
          <circle cx="204" cy="184" r="30" fill={tone.shape} opacity=".55" />
          <path d="M60 210 q 40 -30 90 -6" stroke={tone.shape2} strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      );
    case "dal":
      return (
        <g>
          {[
            [88, 96, 34], [150, 78, 26], [206, 110, 38], [112, 168, 30], [178, 190, 28], [66, 200, 20], [240, 176, 22]
          ].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.72} fill={i % 2 ? tone.shape : tone.shape2} opacity=".92" transform={`rotate(${i * 27} ${x} ${y})`} />
          ))}
        </g>
      );
    case "papad":
      return (
        <g>
          <circle cx="126" cy="142" r="84" fill={tone.shape2} />
          <circle cx="126" cy="142" r="84" fill="none" stroke={tone.shape} strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" />
          <circle cx="196" cy="110" r="70" fill={tone.shape} opacity=".8" />
          <circle cx="196" cy="110" r="70" fill="none" stroke={tone.shape2} strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
        </g>
      );
    case "bundles":
      return (
        <g>
          <rect x="64" y="104" width="172" height="112" fill={tone.shape} opacity=".95" />
          <rect x="64" y="104" width="172" height="26" fill={tone.shape2} opacity=".4" />
          <rect x="140" y="104" width="20" height="112" fill={tone.shape2} />
          <path d="M150 104 C 118 60, 88 84, 118 104 M150 104 C 182 60, 212 84, 182 104" stroke={tone.shape2} strokeWidth="9" fill="none" strokeLinecap="round" />
        </g>
      );
    default:
      return (
        <g>
          <path d="M150 210 C 90 170, 90 96, 150 56 C 210 96, 210 170, 150 210 Z" fill={tone.shape} opacity=".9" />
          <path d="M150 210 L150 92" stroke={tone.shape2} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
  }
}

export function ProductFallback({
  categoryId,
  className = "",
  compact = false
}: {
  categoryId: string;
  className?: string;
  compact?: boolean;
}) {
  const tone = CATEGORY_TONE[categoryId] ?? CATEGORY_TONE.other;
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: tone.bg }}
      role="img"
      aria-label={`${tone.label} — photo coming soon`}
    >
      <div className="grain absolute inset-0 opacity-70" aria-hidden="true" />
      <svg
        viewBox="0 0 300 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <CategoryShapes categoryId={categoryId} tone={tone} />
      </svg>
      {!compact && (
        <div
          className="absolute bottom-3 left-3.5 font-serif text-[15px] font-semibold leading-none tracking-tight"
          style={{ color: tone.ink }}
        >
          {tone.label}
        </div>
      )}
    </div>
  );
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function productImageUrl(productId: string, version?: number) {
  if (!SUPABASE_URL) return null;
  const base = `${SUPABASE_URL}/storage/v1/object/public/product-images/${productId}.jpg`;
  return version ? `${base}?v=${version}` : base;
}

export function storagePathToUrl(storagePath: string) {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${storagePath}`;
}

type GalleryRow = { storage_path: string; variant_id?: string | null; view?: string | null; sort_order?: number };

const VIEW_ORDER: Record<string, number> = { front: 0, back: 1 };
function sortRows(rows: GalleryRow[]) {
  return [...rows].sort(
    (a, b) =>
      (VIEW_ORDER[a.view ?? ""] ?? 2) - (VIEW_ORDER[b.view ?? ""] ?? 2) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
}

/** Image resolution for one pack size. Order of preference:
 *  1. images tagged to the selected variant (front, then back)
 *  2. shared images (no variant)
 *  3. images of the product's default variant, then any image of THIS product
 *  4. the legacy single file (<product-id>.jpg)
 * Only ever returns images of the given product. `exact` is true only for (1);
 * the UI uses it to say "pack shown may differ from selected size". */
export function resolveVariantGallery(
  product: { id: string; images?: GalleryRow[]; variants?: { id: string; is_default?: boolean }[] },
  variantId?: string | null
): { urls: string[]; exact: boolean } {
  const images = product.images ?? [];
  const toUrls = (rows: GalleryRow[]) =>
    sortRows(rows).map((r) => storagePathToUrl(r.storage_path)).filter((u): u is string => !!u);
  const exactRows = variantId ? images.filter((i) => i.variant_id === variantId) : [];
  if (exactRows.length > 0) return { urls: toUrls(exactRows), exact: true };
  const shared = images.filter((i) => !i.variant_id);
  if (shared.length > 0) return { urls: toUrls(shared), exact: false };
  const defId = product.variants?.find((v) => v.is_default)?.id;
  const defRows = defId ? images.filter((i) => i.variant_id === defId) : [];
  if (defRows.length > 0) return { urls: toUrls(defRows), exact: false };
  if (images.length > 0) return { urls: toUrls(images), exact: false };
  const legacy = productImageUrl(product.id);
  return { urls: legacy ? [legacy] : [], exact: false };
}

/** Ordered list of gallery image URLs for a product (product-level, i.e. the
 * primary image first: front before back, shared/default before others).
 * Falls back to the legacy fixed filename (<product-id>.jpg). */
export function getGalleryUrls(product: { id: string; images?: GalleryRow[]; variants?: { id: string; is_default?: boolean }[] }): string[] {
  const images = product.images ?? [];
  if (images.length === 0) {
    const legacy = productImageUrl(product.id);
    return legacy ? [legacy] : [];
  }
  const defId = product.variants?.find((v) => v.is_default)?.id;
  const rank = (i: GalleryRow) => (!i.variant_id ? 0 : i.variant_id === defId ? 1 : 2);
  // front before back first, then shared/default-variant before other variants
  const ordered = sortRows(images).sort(
    (a, b) => (VIEW_ORDER[a.view ?? ""] ?? 2) - (VIEW_ORDER[b.view ?? ""] ?? 2) || rank(a) - rank(b)
  );
  return ordered.map((r) => storagePathToUrl(r.storage_path)).filter((u): u is string => !!u);
}

export default function ProductImage({
  productId,
  categoryId,
  alt,
  className = "",
  iconSize = "text-4xl",
  version,
  imageUrl,
  priority = false,
  fit = "cover",
  thumb = false
}: {
  productId: string;
  categoryId: string;
  alt: string;
  className?: string;
  iconSize?: string;
  version?: number;
  /** Explicit URL to show (e.g. the selected gallery photo) — takes
   * priority over the legacy fixed-filename lookup when provided. */
  imageUrl?: string | null;
  /** Above-the-fold image (hero): load eagerly with high fetch priority. */
  priority?: boolean;
  /** "contain" keeps a whole package visible; "cover" fills (lifestyle). */
  fit?: "cover" | "contain";
  /** Use the smaller pre-generated card image when available. */
  thumb?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const fullSrc = imageUrl !== undefined ? imageUrl : productImageUrl(productId, version);
  // thumb: use the 640px "-card" copy of a storage photo when one exists;
  // if it is missing (404) we fall back to the full-size image.
  const cardSrc =
    thumb && !thumbFailed && fullSrc && /-(front|back)\.webp(\?.*)?$/.test(fullSrc)
      ? fullSrc.replace(/\.webp/, "-card.webp")
      : null;
  const src = cardSrc ?? fullSrc;

  useEffect(() => {
    setFailed(false);
    setThumbFailed(false);
  }, [version, productId, imageUrl]);

  if (!src || failed) {
    // Small thumbnails (cart, wishlist, admin) pass a small iconSize —
    // hide the caption there so the plate doesn't get crowded.
    const compact = /^text-(xs|sm|base|lg|xl|2xl)$/.test(iconSize);
    return <ProductFallback categoryId={categoryId} className={className} compact={compact} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => (cardSrc ? setThumbFailed(true) : setFailed(true))}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
      className={`${fit === "contain" ? "object-contain" : "object-cover"} ${className}`}
    />
  );
}
