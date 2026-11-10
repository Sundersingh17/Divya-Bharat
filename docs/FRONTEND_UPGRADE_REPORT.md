# Divya Bharat — Frontend upgrade report

Scope: upgrade of the existing Next.js 14 / Supabase store. Nothing was rebuilt; Supabase schema, products, variants,
cart, checkout, Razorpay, orders, admin and authentication logic are unchanged except where listed under "Behaviour changes".

## 1. UI summary
- **Brand system:** Cormorant Garamond (headings) + Manrope (body); ivory #F7F2E9, terracotta #B6503B, olive #69724F, antique gold #B49A6A, ink #29231F. Tokens live in `tailwind.config.ts`.
- **Logo:** original supplied emblem, extracted at full quality (`public/brand/`, `public/icons/`), used in header, footer, splash, favicon, PWA icons.
- **Homepage:** hero with real product photography; **Heritage Pantry** (scroll-led 3D aisle, one shelf per live category, packs as 3D slabs with front/back faces); category cards; **Oil turntable** (3D ring, select bottle → name, pack sizes, price, add to cart, flip to back); favourites, recipes, trust, newsletter.
- **Catalogue:** product cards (square photos, pack-size selector, price hierarchy, hover to back-of-pack, Add to cart feedback), filters, search with ranked/typo-tolerant suggestions, keyboard navigation and recent searches, visual category tiles on the Shop page.
- **Product page:** front/back gallery with fade + swipe, variant-specific photos and prices, low-stock notice, recently viewed, mobile sticky buy bar.
- **Opening screen:** ivory splash — gold ring draws round the emblem, light sweep, wordmark + tagline, soft zoom-fade out; once per session; reduced-motion safe; CSS failsafe.
- **PWA:** `app/manifest.ts`, icons (incl. maskable), offline page + minimal service worker (caches only `/offline`).
- **Mobile:** bottom nav Home / Categories / Search / Cart / Account; 3D scenes replaced by swipeable shelves and a swipeable oil row.

## 2. 3D approach and limits (read this)
CSS 3D transforms only (no WebGL / Three.js; no new dependencies). Packs are **photo slabs**: front photo + back photo with thickness. They are
*not* modelled 360° renders and not transparent cut-outs, because the supplied photos are full scenes. Drop transparent
`<id>-front.png` / `<id>-back.png` into `assets/cutouts/` and run the upload script to upgrade a product to a standee automatically
(see `assets/cutouts/README.txt`). Real `.glb` models would need a 3D library added on your machine.

## 3. Performance
- Pantry/turntable code-split with `next/dynamic` and only mounted when scrolled near (`LazyMount`).
- 640 px card-size photos (~42 KB) used in grids; full 1600 px only on the product page.
- Back-of-pack hover image loads after first hover only.
- No extra npm dependencies were added.

## 4. Accessibility
Skip link + `<main>` landmark; visible focus; 16 px form fields on phones; labelled payment toggle; combobox semantics and arrow-key navigation in search;
reduced-motion handled per feature plus a global safety rule; no images without alt text and no unlabeled icon-only buttons found in a scripted scan.

## 5. Behaviour changes outside pure design (please review)
- Stock: public pages now show "Only N left" (≤ `NEXT_PUBLIC_LOW_STOCK_THRESHOLD`, default 10) and pages refresh immediately after admin edits and orders; admin edits trigger the low-stock alert; admin products page auto-refreshes and shows a low-stock banner; add-to-cart is capped at stock. **Automatic deduction on orders requires `supabase/migration_27_ops.sql` to have been run** (the admin page warns if not).
- `scripts/upload-product-images.mjs` gained `--overwrite` and cut-out support.

## 6. Files
**New:** `src/components/SplashScreen.tsx`, `src/app/manifest.ts`, `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/offline/page.tsx`, `src/app/product/[slug]/loading.tsx`, `public/sw.js`, `public/brand/*`, `public/icons/*`,
`src/components/CategoryTiles.tsx`, `RecentlyViewed.tsx`, `ServiceWorkerRegister.tsx`, `home/HeritagePantry.tsx`, `home/OilTurntable.tsx`, `pantry/Pack3D.tsx`, `pantry/PantryPlate.tsx`, `pantry/LazyMount.tsx`,
`src/lib/pantry.ts`, `usePantryMode.ts`, `recentlyViewed.ts`, `stockLevel.ts`, `revalidateStore.ts`, `scripts/upload-product-images.mjs`, `assets/product-images/*`, `assets/cutouts/README.txt`, `docs/*`.
**Modified:** `tailwind.config.ts`, `src/app/layout.tsx`, `globals.css`, `template.tsx`, `collections/page.tsx`, `checkout/page.tsx`, `src/components/{Header,Footer,MobileBottomNav,CartDrawer,ProductCard,ProductDetailClient,ProductGallery,ProductImage,ProductGrid,Search,HomeClient}.tsx`, `home/Hero.tsx`,
`src/lib/{stock,placeOrder}.ts`, `src/app/api/{admin-products,admin-variants,admin-health}/route.ts`, `src/app/admin/products/page.tsx`, loading skeletons.
**Removed:** `src/app/icon.svg` (old "DB" icon).

## 7. Test results
Environment had no npm registry access, so **no `npm install`, lint, build or browser run was possible.** What was done: syntax-only TypeScript parse of all changed files (clean);
brace-balance check on the CSS; logic test of search ranking (typos, word order); visual mock renders of the splash, shelf, pedestal and 3D ring using the real CSS and product photos; scripted accessibility scan.
**You must run:** `npm install && npm run lint && npm run build`, then click through home, shop, product, cart, checkout (test mode), admin stock edit and a test order.

## 8. Remaining / known issues
- Packs are slabs, not cut-outs or true 3D models (section 2).
- Gemini's invisible provenance watermark (if any) is untouched; label text on some AI pack images contains errors (see `PRODUCT_ASSET_MAPPING.md`) and should be replaced with real pack photos before launch.
- Non-default pack sizes have no photos of their own (shown with a note).
- Upload script untested against live Supabase; run a dry run first.
- Printed MRPs on pack photos not reconciled with database prices.

## 3D models (GLB)
25 product models are in `public/models/` (one per product) with `viewer.html` and `README.md`. They are procedural shapes with the photo labels wrapped on, not photoreal scans. Verified only with a custom software renderer; check them in a real glTF viewer.
