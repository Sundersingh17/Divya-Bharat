# Divya Bharat — PRD customisation: change log & launch readiness

Branch `prd-customisation` (baseline snapshot = first commit). Roll back with `git checkout <baseline>`.

## 16-page route map
| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Homepage | `/` | existing; category links repointed to `/collections/{id}`; card-level `clip` removed (regression guard) |
| 2 | Shop & Search | `/collections` (+ `/search` redirect) | **new**: search, category, filters, sort, counts, empty state, Show-more pagination |
| 3 | Category / Collection | `/collections/[slug]` | landing collection first, else category page with breadcrumbs; 404 otherwise |
| 4 | Product | `/product/[slug]` | existing; variant-aware gallery, delivery/returns accordion, JSON-LD uses variant prices/stock |
| 5 | Shop by Need | `/use-case`, `/use-case/[slug]` | existing, unchanged |
| 6 | Offers & Combo Kits | `/offers` | **new** (daily offers + `bundles` kits) |
| 7 | Cart | `/cart` | **new** (drawer kept, links to it) |
| 8 | Checkout | `/checkout` | existing; now server-priced |
| 9 | Order confirmation | `/order-confirmation?order=` | **new**; reads server record via `/api/orders/confirm` (owner only) |
| 10 | Track order | `/orders` | reworked: signed-in = own orders; guest = order ID + phone, masked address |
| 11 | My Account | `/account` | existing, unchanged |
| 12 | Club | `/membership` | existing; payment verify hardened |
| 13/14 | Blog | `/blog`, `/blog/[slug]` | existing, unchanged |
| 15 | About | `/about` | rebuilt with verified text only + published certificates |
| 16 | Help & Policies | `/help` (tabs, `#faq #contact #shipping #returns #order-support #privacy #terms`) | **new**; `/policies` redirects here; `/returns` workflow kept |

## Security / payment fixes (code)
- `src/lib/serverPricing.ts`: prices (incl. daily offers), stock, club discount, coupon, points, delivery and total recomputed on the server. Browser totals are only a sanity check (409 if they differ).
- `/api/orders` (COD), `/api/razorpay/create-order`, `/api/razorpay/verify` rewritten around it; shared `lib/placeOrder.ts`, `lib/coupons.ts`.
- Razorpay: amount comes from the server quote; verify uses timing-safe signature check, binds to the Razorpay order (amount + user), is idempotent per payment id, rejects a payment used by another user.
- COD: 30-second duplicate-submit guard.
- Membership verify: plan bound to amount actually charged; one membership per payment.
- Guest order lookup no longer returns every order for a phone number.
- Removed unverified product tags ("Cold-processed", "No chemicals added"); Razorpay test-mode hint only shown for `rzp_test_` keys.
- Fixed a pre-existing type error (dead `tryLogin` in `admin/coupons`) that would fail `next build`.
- `SITE_URL` now from `NEXT_PUBLIC_SITE_URL` (placeholder fallback), used by layout, sitemap, robots, JSON-LD.

## You must do (not done in code)
1. Run `supabase/migration_25_prd_hardening.sql` (additive: unique payment-id indexes; `product_images.variant_id` + `view`). Check for duplicate payment ids first.
2. `npm install && npx tsc --noEmit && npm run build && npm run lint` — **not run in my sandbox (npm registry blocked)**; I could only syntax-check.
3. Set `NEXT_PUBLIC_SITE_URL`, FSSAI, WhatsApp/Instagram/Email env vars.
4. Tag variant images in Admin → Products → Photos (choose pack size + Front/Back before uploading). Untagged images show for every size. Confirm real 250 ml/500 ml/1 L/2 L and 250 g/500 g/1 kg variants exist in `product_variants`.
5. Business to confirm/replace: "Cold-pressed in Odisha" header banner and SEO copy, About production/sourcing details, shipping timelines/PIN serviceability, privacy & terms text (marked Draft), Odia translations.
6. Test end-to-end in Razorpay test mode: COD, online pay, failed/cancelled payment, coupon, points, Club, tampered cart.

## Known remaining risks
- Rate limiting is in-memory (ineffective across Vercel instances) → move to Upstash Redis.
- Stock is validated but not decremented/reserved on order (no atomic reservation; changing it alters current behaviour).
- Shared `ADMIN_PASSWORD` still works; review before launch.
- `/returns` lookup is still phone-based; coupons have no public "offers" list (no public flag in schema).
- Not built (PRD §7 extras): PIN checker, restock alerts, post-purchase review requests.

## Round 2 — optional extras (PRD §7)
Run `supabase/migration_26_extras.sql` (additive: `restock_requests`, `delivery_pincodes`).
1. **Restock notifications** — out-of-stock size shows "Notify me"; `/api/restock` (rate-limited, only for genuinely out-of-stock sizes). When admin raises a size's stock from 0 in Admin → Products, waiting customers are emailed once (needs `RESEND_API_KEY`).
2. **Product ↔ recipe links** — link a product inside a recipe's Markdown as `[mustard oil](/product/mustard-oil)`. The recipe page then shows "Products in this recipe" and the product page shows "Recipes & guides using…". No extra data entry.
3. **Post-delivery review invite** — the "Delivered" email lists each product with a link to its review section (genuine reviews only; verified-purchase still decided server-side). Skipped until `NEXT_PUBLIC_SITE_URL` is set.
4. **Delivery PIN checker** — Admin → Delivery: paste `pincode,min_days,max_days` lines. The checker on product pages stays hidden until real PIN data exists; nothing is guessed.
Not type-checked/built here either (registry blocked) — run `npm run build` first.

## Round 3 — operations (run `supabase/migration_27_ops.sql`)
1. **Atomic stock** — orders now take stock via `reserve_stock` (all-or-nothing, can't oversell the last unit); cancelling an order puts it back. Orders placed before the migration are never "restored". If the migration isn't run, behaviour is unchanged.
2. **Event log** — payment mismatches, order failures, failed emails, sold-out races, low-stock are recorded in `system_events`.
3. **Low-stock email** to `ADMIN_NOTIFICATION_EMAIL` when a sale drops a size to `LOW_STOCK_THRESHOLD` (default 10) or below.
4. **Admin → Health** page: 30-day orders, abandoned-cart recovery, low-stock list, 7-day problems.
5. **Shared rate limiting** — set `UPSTASH_REDIS_REST_URL` + `_TOKEN` to make limits work across Vercel instances on orders, payment, coupon and restock routes (falls back to in-memory otherwise).
Test: set a size's stock to 2 in Admin → Products, order 2 → stock shows 0 and "Out of stock"; cancel the order in Admin → stock returns to 2.

## Round 4 (run `supabase/migration_28_tracking.sql`)
1. **Courier tracking** — in Admin → Orders, once an order is Packed/Shipped/Delivered a "Save tracking" row appears (courier, tracking no., https link). Customers see it on their order (My account / Track order) and in the "Shipped" email.
2. **Admin password kill switch** — after adding yourself under Admin → Staff and confirming staff login works, set `ADMIN_PASSWORD_DISABLED=true` to turn the shared password off.
3. **SEO** — product pages add BreadcrumbList and real aggregateRating (only when real reviews exist); homepage Organization gets `url` and Instagram `sameAs` if configured.
4. **Admin → Newsletter** — see subscribers, remove one, download CSV.

## Round 5 (no new migration)
- **Fix:** Admin → Newsletter returned 500 when the `newsletter_subscribers` table didn't exist; it now shows a clear note to run `migration_24_newsletter.sql`. (The 401s on `/api/admin-whoami` in the browser console are normal when you aren't signed in as staff.)
1. **Customer self-cancel** — "Cancel order" on orders still in "Placed" (signed in). Cancels atomically, reverses points, restores stock, emails the customer and the business, and refunds Razorpay payments automatically; if the refund call fails the order is marked `refund_pending` and you get an email.
2. **Admin orders: search, status filter, CSV export.**
3. **Admin → Reviews** — delete spam/abusive reviews.
4. **Share button** on product pages (native share sheet, WhatsApp fallback).
Test cancel with a Razorpay *test* payment first and confirm the refund shows in the Razorpay dashboard.
