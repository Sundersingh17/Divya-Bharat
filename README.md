# Divya Bharat Food Processing Centre — Storefront

A real, deployable Next.js + Supabase e-commerce site for Divya Bharat Food
Processing Centre, with real online payments (Razorpay), a WhatsApp enquiry
button, and basic security hardening.

## What's included

- Full storefront: catalog, category filters, search, product detail, cart, checkout
- **Real product photo support** — see `public/images/products/README.md`
- Orders written to a real Postgres database (via Supabase)
- **Razorpay checkout** (test mode by default) with signature verification, alongside cash on delivery
- **WhatsApp enquiry button** on every page
- **Automated order emails** — confirmation to the customer, new-order alerts to you, status updates when you mark orders Shipped/Delivered
- **Phone OTP customer accounts** — real login via SMS, with a secure `/account` page showing only that customer's own orders; guest checkout (phone lookup, no login) still works too
- Nutrition facts panel on every product page
- **Reviews & ratings, wishlist, Subscribe & Save, and combo/bundle kits**
  (see "Phase 2 features" below)
- A password-gated `/admin` page to view orders, payment status, and update delivery status
- SEO: server-rendered pages, dynamic metadata, sitemap.xml, robots.txt, JSON-LD structured data
- Security: input validation, rate limiting, security headers, timing-safe admin auth, Row-Level-Security-enforced order access (see "Security notes" below)

## 1. Set up Supabase (free tier)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste in `supabase/schema.sql`, click **Run**.
   (If you already ran the schema before this update, also run
   `supabase/migration_2_razorpay.sql` to add the new payment columns.)
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

## 2. Set up Razorpay (free, test mode)

1. Create a free account at [razorpay.com](https://razorpay.com).
2. Stay in **Test Mode** (toggle top-right of the dashboard) — this costs
   nothing and lets you simulate full UPI/card payments with dummy details.
3. Go to **Settings → API Keys → Generate Test Key**.
4. Copy the **Key ID** → `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   Copy the **Key Secret** → `RAZORPAY_KEY_SECRET` (keep this secret)
5. Test card for checkout: `4111 1111 1111 1111`, any future expiry, any CVV,
   any name. Test UPI: use Razorpay's test UPI ID shown in their docs.

Switching to real payments later just means generating **Live Mode** keys
from the same page once Razorpay approves your business KYC — no code
changes needed.

## 3. Add your product photos

Run `supabase/migration_10_product_images.sql` in Supabase's SQL editor to
set up image storage (one-time). Then go to `/admin/products` (see "Where's
the admin panel" below), click **Photo** next to any product, and upload a
picture from your phone or computer — it appears on the site within
seconds, no filenames or code involved. No photo yet, and the product still
displays cleanly with a styled placeholder instead of a broken image.

Recommended: square photos, at least 800×800px, JPG/PNG/WebP, under 5MB
(the upload will reject anything larger).

## 4. Set your WhatsApp number

Open `src/components/WhatsAppButton.tsx` and replace `WHATSAPP_NUMBER` with
your real business WhatsApp number (international format, digits only, e.g.
`919876543210`).

## 5. Set up Resend for order emails (free)

1. Create a free account at [resend.com](https://resend.com) — no credit
   card needed, 100 emails/day free.
2. Go to **API Keys → Create API Key**, copy it into `RESEND_API_KEY`.
3. Leave `RESEND_FROM_ADDRESS` as-is for testing — Resend's shared
   `onboarding@resend.dev` sender works immediately with zero setup and
   delivers to real inboxes. Once you verify your own domain in Resend
   (Domains → Add Domain), switch this to your own address for a properly
   branded sender.

Customers now get an automatic confirmation email right after checkout
(only if they entered one — it's an optional field), and another whenever
you mark their order Shipped, Delivered, or Cancelled from `/admin`.
**You also get an email every time a new order comes in** — set
`ADMIN_NOTIFICATION_EMAIL` to your own address in `.env.local` so you don't
have to keep checking `/admin` manually to know when to pack an order.
Without `RESEND_API_KEY` set, the site still works fine — it just skips
sending emails and logs a warning in your server console instead.

## 6. Set up phone login (OTP) — free trial, then paid per SMS

Customer accounts now work via a real SMS one-time-passcode, using
Supabase's built-in phone auth. Setup happens entirely in the Supabase
dashboard — no new environment variables needed.

1. Create a free account at [twilio.com](https://twilio.com). New accounts
   get free trial credit (enough for plenty of testing).
2. In the Twilio console, note your **Account SID**, **Auth Token**, and
   either buy a Twilio phone number or use **Messaging → Services** to
   create a Messaging Service SID.
3. **Twilio trial accounts can only send SMS to phone numbers you've
   manually verified** in the Twilio console (Phone Numbers → Verified
   Caller IDs) — the same kind of restriction as Resend's test mode. Add
   your own phone number there before testing OTP login.
4. In your Supabase project: **Authentication → Providers → Phone**,
   toggle it on, choose **Twilio** as the provider, and paste in your
   Account SID, Auth Token, and Messaging Service SID (or phone number).
5. Save. That's it — the app already has the login UI built (the
   "Sign in" link in the header, and `/account`).

Test it: click **Sign in**, enter your (Twilio-verified) phone number,
enter the code you receive by SMS, and you're in. Orders placed while
signed in now show up automatically on `/account` — no phone number
re-entry, no localStorage tricks, just a real login session.

**Cost note:** Twilio isn't free forever — after your trial credit runs
out, SMS costs a small amount per message (a few cents). This is normal
and unavoidable for real SMS OTP; budget for it once you're past testing.
Guest checkout (no login) still works exactly as before if you'd rather
not require an account.

## 7. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in all the values from steps 1–2, plus your own `ADMIN_PASSWORD`.

## 8. Install and run locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Try both payment paths at checkout, then check
`http://localhost:3000/admin` to see the order with its payment status.

## 9. Deploy for free

1. Push to GitHub, import into [vercel.com](https://vercel.com).
2. Add all the same environment variables under **Settings → Environment Variables**.
3. Deploy — you get a free `*.vercel.app` URL to share with test users.

## Where's the admin panel?

`/admin` — not linked in the main navigation on purpose (so it's not the
first thing a random visitor clicks), but there's a small, low-key
**"Admin"** link in the site footer's bottom bar so you don't have to
remember or bookmark the URL. Five tabs once inside: **Orders**,
**Dashboard**, **Products**, **Coupons**, **Staff**.

Two ways to sign in: the shared `ADMIN_PASSWORD` (always works, grants
owner access), or — once you've added yourself/staff via `/admin/staff` —
just sign in with your normal customer account (top-right "Sign in") and
visit `/admin`, no password needed.

## Security notes (read before a public launch)

This build includes real security basics, but a few things are intentionally
simple for the free-tier testing phase — know these before scaling up:

- **Rate limiting is in-memory.** It works within a single server process but
  doesn't share state across serverless instances (Vercel's default). Fine
  for stopping casual abuse during testing; for real traffic, swap
  `src/lib/rateLimit.ts` for a shared store like Upstash Redis (has a free tier).
- **Admin auth is a single shared password**, not per-user accounts. Fine for
  one founder testing; before adding staff, move to Supabase Auth with roles.
- **Order data access is now properly secured** (fixed in this update) —
  logged-in customers can only query their own orders (`auth.uid() = user_id`
  in Row Level Security), not the whole table. Guest checkout (no login)
  still allows phone-based lookup, but only through the rate-limited
  `/api/orders` route using the service-role key — never directly queryable
  by anyone with the anon key.
- **Payment verification is done server-side** via HMAC signature check
  (`src/app/api/razorpay/verify/route.ts`) — this part follows Razorpay's
  official security recommendation and doesn't need changes for launch.
- Security headers (X-Frame-Options, HSTS, etc.) are set in `next.config.js`
  and apply automatically once deployed over HTTPS (Vercel does this by default).

## Project structure

```
src/
  app/
    page.tsx                  → homepage
    product/[slug]/            → product detail page
    checkout/                   → checkout: Razorpay + COD, attaches logged-in user
    account/                     → OTP sign-in + secure order history
    orders/                       → guest order lookup by phone (no login)
    admin/                         → password-gated order management
    api/orders/                     → COD order placement + guest phone lookup
    api/razorpay/create-order/       → step 1 of online payment
    api/razorpay/verify/              → step 2: verifies payment, creates order
    api/admin-orders/, api/admin-products/ → admin data access
  components/                  → Header, Footer, ProductCard, ProductImage,
                                  CartDrawer, OrderList, WhatsAppButton, etc.
  context/                     → CartContext, ToastContext, AuthContext (OTP login)
  lib/                         → Supabase clients, Razorpay client, Resend email,
                                  validation, rate limiting, admin auth, shared types
supabase/
  schema.sql                    → run once for a fresh install
  migration_2_razorpay.sql       → run once if you set up the DB before Razorpay was added
  migration_3_nutrition.sql       → adds nutrition facts columns
  migration_4_email.sql            → adds the email column for order confirmations
  migration_5_accounts.sql          → adds user accounts + tightens order security
public/images/products/          → drop real product photos here
```

## Phase 2 features (added in this update)

Four things from the original PRD's Phase 2 roadmap, all working end to end:

- **Reviews & ratings** — signed-in customers can leave a star rating + review
  on any product page. Verified-purchase badges are computed server-side
  (checking for a Delivered order containing that product), so they can't be
  spoofed from the browser. Average ratings show on both the product page and
  the product grid, via a lightweight database view (`product_ratings`) so
  the grid doesn't need one query per product.
- **Wishlist** — a heart icon on every product card and detail page. Requires
  sign-in; saved items show up under My Account → Wishlist, with one-tap
  "Add to cart".
- **Divya Bharat Club — paid membership** (replaces an earlier per-product
  subscription design with a platform-wide model, closer to Zepto Gold /
  Amazon Prime): ₹99/month or ₹899/year for free delivery on every order plus
  10% off everything, purchased through Razorpay (test mode). Visible from
  the header's "Club" link and from My Account. Applied automatically at
  checkout and in the cart drawer once active — no code changes needed by
  the customer, the discount and free shipping just show up.
- **Combo/bundle kits** — two starter kits seeded in the database (`Odisha
  Breakfast Kit`, `Cooking Essentials Kit`), shown under a "Combo Kits"
  category like any other product. The product page shows exactly what's
  included and how much you save versus buying separately. Add more kits by
  inserting into `products` (with `category_id = 'bundles'`) and
  `bundle_items` in Supabase — no code changes needed.

Run `supabase/migration_6_phase2.sql` then `supabase/migration_7_membership.sql`
in Supabase's SQL editor to add all of this. Membership reuses your existing
Razorpay test keys — nothing new to configure.


Pages are now server-rendered with real HTML content (not blank
JavaScript shells), which is what lets Google actually index them:

- **Server-rendered catalog & product pages** — product data is fetched on
  the server and rendered into the initial HTML, with interactive bits
  (cart, search, filters) layered on top as client components.
- **Dynamic per-product metadata** — each product page generates its own
  title, description, and canonical URL from its real data (see
  `generateMetadata` in `src/app/product/[slug]/page.tsx`).
- **Structured data (JSON-LD)** — `Organization` schema on the homepage,
  `Product`/`Offer` schema on every product page, so Google can show rich
  results (price, availability) directly in search.
- **`sitemap.xml`** (`src/app/sitemap.ts`) — auto-generated from your live
  product list, and **`robots.txt`** (`src/app/robots.ts`) — allows the
  storefront, blocks `/admin`, `/checkout`, `/orders`, and `/api/`.
- **`noindex` on private pages** — checkout, order tracking, and admin are
  explicitly excluded from search results.

**Before launch, replace the placeholder domain** `https://example.com` in
three files with your real domain once you have one:
`src/app/layout.tsx` (`metadataBase`), `src/app/sitemap.ts`, and
`src/app/robots.ts`. Then submit `yourdomain.com/sitemap.xml` to
[Google Search Console](https://search.google.com/search-console) so Google
starts crawling it.

## This update: admin tools, coupons, analytics, abandoned cart recovery

- **Admin: manage products** — `/admin/products` now lets you add new
  products and edit price/stock/active-status inline, instead of only
  being able to do that through raw SQL. `/admin/coupons` does the same
  for promo codes.
- **Coupon/promo codes** — a code input at checkout, validated server-side
  (`/api/coupons/validate`), stacks with Club membership discounts. Two
  starter codes are seeded: `WELCOME10` (10% off, ₹199 minimum) and
  `FREESHIP` (free delivery, ₹299 minimum). Manage codes from
  `/admin/coupons` — create new ones, disable old ones, see usage counts.
- **Analytics (GA4 + Meta Pixel)** — both fully optional; leave the env
  vars blank and nothing loads, no tracking, no console errors. Set
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` and/or `NEXT_PUBLIC_META_PIXEL_ID` and
  the site automatically tracks view-item, add-to-cart, begin-checkout,
  and purchase events — the standard e-commerce funnel both platforms
  expect.
- **Abandoned cart recovery** — this one needed a real design decision:
  carts live only in the browser (localStorage), so the server can't see
  an "abandoned" cart by default. The moment someone types a valid email
  at checkout (even if they never finish), a snapshot of their cart is
  saved. An hourly cron job (`/api/cron/abandoned-carts`) finds snapshots
  untouched for 1+ hours that never converted to an order, and emails a
  "resume checkout" link that restores their exact cart. Setup:
  1. Set `CRON_SECRET` in your environment to any random string
     (`openssl rand -hex 32` works) — this is what protects the endpoint
     from being called by anyone else.
  2. Set `NEXT_PUBLIC_SITE_URL` to your real domain (used to build the
     link inside the reminder email).
  3. Deploy to Vercel — `vercel.json` already configures the cron to run
     hourly; Vercel automatically sends the right auth header when
     `CRON_SECRET` is set, no extra config needed.
  4. Requires `RESEND_API_KEY` to already be set (same one used for order
     emails) — if it's missing, the cron runs but skips sending and logs
     why.

Run `supabase/migration_8_coupons.sql` and `supabase/migration_9_abandoned_cart.sql`
in Supabase's SQL editor to add all of this.

## This update: multi-language toggle, referral program, image uploads, admin discoverability

- **English/Odia language toggle** — a small "EN / ଓଡ଼ିଆ" button in the
  header switches the core customer-facing UI (nav, hero, cart, checkout
  labels, footer). Preference is remembered per browser. **Important:**
  these translations are a solid starting draft, not reviewed by a native
  Odia speaker — get one to review `src/lib/translations.ts` before this
  goes in front of real customers, same caution as the nutrition figures
  and FSSAI status. The `/admin` panel intentionally stays English-only.
- **Referral program** — every signed-in customer gets a unique referral
  link (My Account → Refer a friend) they can copy or share on WhatsApp.
  When someone new signs up through that link and completes their first
  order, the referrer automatically gets a 15%-off coupon — emailed to
  them if they have an email on file, and always visible in their account
  either way. Self-referral and double-referral are blocked server-side.
- **Real product photo uploads** and **a discoverable admin panel** — see
  the updated steps 3 and "Where's the admin panel" sections above.

Run `supabase/migration_10_product_images.sql` and
`supabase/migration_11_referrals.sql` in Supabase's SQL editor to add the
image storage and referral tables.

## This update: pack size variants, cleaner product cards

- **Pack size variants** (like Zepto/Blinkit) — products can now offer
  multiple sizes (e.g. Mustard Oil in 250ml / 500ml / 1L), each with its
  own price. Size selector appears directly on the product card (compact
  pills) and on the product detail page (larger pills). Cart items are now
  keyed by the specific size chosen, so 250ml and 1L of the same oil sit
  as two separate lines in the cart, correctly priced.
  - `supabase/migration_12_product_variants.sql` seeds every product with
    its existing size as a default variant (nothing breaks for products
    you haven't added extra sizes to yet), plus extra size options for
    oils, chhatua, flours, dal, and spices — treat the seeded prices as a
    starting point and adjust in `/admin/products` once you know real
    per-size costs.
  - Order history (customer-facing and admin) now shows which pack size
    was actually ordered, not just the product name.
  - **Scope note:** adding/editing variants currently requires SQL (via
    Supabase's table editor on `product_variants`) — there's no
    admin-panel UI for it yet, unlike the base product fields. Worth
    building if you end up adding sizes often.
- **Cleaner product cards** — more breathing room between name, rating,
  size selector, and price; fixed the cramped spacing you flagged.

Run `supabase/migration_12_product_variants.sql` in Supabase's SQL editor
to add this.

## This update: security fix, email OTP, card spacing

- **Security fix — sign-in is now mandatory before checkout.** Previously,
  guest checkout was allowed at the database/API level even though the UI
  nudged people toward signing in — meaning someone could bypass the
  frontend entirely and call `/api/orders` or `/api/razorpay/verify`
  directly with a fake name/address and no accountability. All three
  order-related API routes (`/api/orders`, `/api/razorpay/create-order`,
  `/api/razorpay/verify`) now reject the request with a 401 if there's no
  valid signed-in session — enforced server-side, not just hidden in the
  UI. The checkout page shows a clear "Sign in to check out" prompt
  instead of the form when you're not logged in, and sends you back to
  checkout automatically after you sign in.
  - `/orders` (phone-based lookup) still works for any orders placed
    before this change, but no new orders can be created without an
    account.
- **Email OTP, alongside phone OTP** — this solves the Twilio trial
  problem (SMS OTP only worked for your own verified number). Now
  `/account` has a Phone/Email toggle — anyone can sign in with just an
  email address and a 6-digit code, no SMS provider limits involved.
  **One-time setup required in Supabase:** go to **Authentication → Email
  Templates → Magic Link**, and change the template body to use
  `{{ .Token }}` instead of `{{ .ConfirmationURL }}` (a short code instead
  of a clickable link) — otherwise Supabase sends a link instead of a
  code and the verification screen won't work. Takes two minutes, no
  code changes needed on top of what's already built.
- **Cleaner product cards** — fixed the edge-to-edge text issue you
  flagged (name/price/Add button were touching the card boundary with
  zero padding) and added a divider line between the size-selector and
  price row, matching the spacing treatment used on order cards.

## This update: account + admin upgrades (six features)

Run `supabase/migration_13_addresses_staff.sql` in Supabase's SQL editor to
add everything below.

**User account:**
- **Saved addresses** — My Account → Addresses. Save multiple (Home/Work/
  Other), pick one at checkout with one tap instead of retyping every
  time. First saved address becomes the default automatically.
- **Reorder button** — every order in My Account → My Orders now has a
  "Reorder" button that refills your cart with the exact same items and
  pack sizes, then takes you straight to checkout.
- **Editable profile** — name and a profile photo, shown at the top of My
  Account. Click your avatar to upload a photo (stored the same way
  product photos are). Name prefills at checkout automatically.

**Admin — the big one is staff accounts:**
- **Staff accounts with roles** — `/admin/staff` (owner-only). Instead of
  everyone sharing one password, you can now add specific customer
  accounts as admin staff. They sign in with their own phone/email OTP
  (the normal customer sign-in) and `/admin` recognizes them
  automatically — no password needed on their end. Two roles: `owner`
  (can manage staff, sees everything) and `staff` (everything else).
  **The shared `ADMIN_PASSWORD` still works** as a fallback/bootstrap
  method, so you're never locked out.
  - **To make yourself the first owner:** sign in once on the site with
    the account you want to use, then run this in Supabase's SQL editor
    (replace the email — or use `phone = '+91...'` if you signed in with
    phone instead):
    ```sql
    insert into admin_users (user_id, role)
    select id, 'owner' from auth.users where email = 'you@example.com';
    ```
- **Sales dashboard** — `/admin/dashboard`. Revenue, order count, average
  order value, active Club members, a 7-day revenue bar chart, orders by
  status, and top-selling products. Last 30 days.
- **Variant management UI** — `/admin/products`, click the size count next
  to any product (e.g. "3 sizes ▼") to expand inline editing: change
  price/pack size, add a new size, remove one, or set which size is the
  default. No more SQL needed for this.

## This update: loyalty points

- Run `supabase/migration_15_loyalty.sql` in Supabase's SQL editor.
- **Earn automatically** — 1 point per ₹20 spent on every completed order,
  no action needed from the customer.
- **Redeem at checkout** — if you have points, a "Use N points" toggle
  appears at checkout showing exactly how much you'll save. Capped at
  50% of an order's subtotal, so points supplement a purchase rather
  than fully paying for one.
- **My Account → Loyalty points** shows your balance and a full history
  (earned / redeemed / reversed) with the order each transaction relates to.
- **Safe against cancellation abuse** — if an admin marks an order
  Cancelled, any points earned or redeemed on that order are automatically
  reversed, so a cancelled order can't be used to farm points or dodge a
  redemption.

## This update: daily offers

- Run `supabase/migration_16_daily_offers.sql` in Supabase's SQL editor.
  (New installs: `schema.sql` already includes it.)
- **`/admin/offers`** — pick a product and pack size, set a special price
  lower than its current selling price, and it goes live on the homepage
  immediately. Toggle it off or delete it whenever you're done running it.
- **One "Deal of the Day"** can be featured at a time (checkbox when
  creating an offer) — it gets its own hero spot above the rest. Any
  number of ordinary offers can run alongside it in a "Today's Offers"
  strip.
- **No scheduling or auto-expiry, on purpose** — this mirrors how a local
  general store runs discounts day to day: you decide what's on offer and
  turn it off yourself. Time-boxed flash sales with a start/end time were
  considered and deliberately left for later; the table's shaped so that
  can be added without a rework.
- The offer price is what customers actually see and pay — it flows
  through the same `product_variants` pricing the rest of the site
  already uses (cart, checkout, invoicless order emails, etc.), so
  nothing downstream needed special-casing.
- **Known limitation carried over from the rest of the store:** order
  creation doesn't re-check submitted item prices against the database —
  this was already true for regular variant prices before this update, and
  offer prices follow the same pattern rather than introducing a new gap.
  Worth hardening at some point (server-side price re-validation on
  `/api/orders`), just not scoped to this change.
- **Redemption amounts are validated server-side** against your real
  balance — the checkout page shows what it thinks you can redeem, but
  the API independently re-checks your actual ledger balance before
  applying any discount, so this can't be gamed by tampering with the
  request.

## What's still needed before a real public launch

- **Product photography:** placeholders until real photos are added (see step 3 above)
- **SMS notifications:** email is automated now; SMS/WhatsApp order status
  updates are still manual (OTP login itself is done — this update)
- **Shipping integration:** delivery status is updated manually from `/admin`;
  no courier API (Shiprocket etc.) wired up yet
- **Legal:** FSSAI license number, GST details, and finalized policy text are
  still placeholders throughout the site
- **Odia translations:** machine/best-effort translated, not reviewed by a
  native speaker — review before customers see them

## This update: advanced search & filters, order tracking timestamps, WhatsApp status updates, returns/refunds

- **Filters** — the homepage now has a "Filters" panel (price range, pack
  size, minimum rating, in-stock only, sort by price/rating) alongside the
  existing search box. Search itself now also matches description text and
  pack sizes, not just product name. No schema changes — built entirely
  from data already on hand (`src/lib/pricing.ts` has the shared helpers).
- **Order tracking now shows real dates per stage** — Placed/Packed/
  Shipped/Delivered each show the date that actually happened, pulled from
  `order_status_history` (which was already being recorded, just never
  displayed). Nothing to run — no schema change, just wired up the display.
- **WhatsApp order-status messages** — `src/lib/whatsapp.ts` sends a
  WhatsApp message via Meta's Cloud API whenever an order is marked
  Shipped/Delivered/Cancelled, same trigger as the existing email. This
  needs a WhatsApp Business account and an approved message template
  before it'll actually send — see the setup comment at the top of that
  file. Until those env vars are set, it's a silent no-op and nothing else
  is affected.
- **Returns & refunds** — run `supabase/migration_17_returns.sql` (new
  installs: already in `schema.sql`). Customers can request a return from
  `/returns` (or the "Request a return" button on a Delivered order),
  attach up to 3 photos, and check status later by phone. A return can
  only be requested once an order is Delivered, and only once per order
  at a time. Admin reviews everything at **`/admin/returns`** — approve,
  reject, or mark refunded, each step emailing the customer.

## This update: GST invoice PDFs

- Run `npm install` (adds `pdfkit`) and `supabase/migration_18_gst_invoice.sql`
  (new installs: already in `schema.sql`).
- Every order now has a **"Download invoice" / "Invoice"** link (My
  Account, guest order lookup, and `/admin`) that generates a PDF on the
  fly at `/api/orders/invoice`.
- Set `BUSINESS_NAME`, `BUSINESS_ADDRESS`, and (once you have one)
  `BUSINESS_GSTIN` in `.env` — these print on every invoice.
- **HSN codes and GST rates are per pack size**, set in `/admin/products`
  under each product's "sizes" panel. Deliberately left blank by default:
  GST rates differ by product (oils, flours, and pulses often sit at
  different slabs, some 0%), so rather than guess, the invoice only shows
  a tax breakup for pack sizes that actually have a rate set — everything
  else prints with a taxable value but no GST line, plus a note explaining
  why. Talk to your CA about the correct HSN codes and rates before
  relying on these for filing; this is a template, not tax advice.
- Prices are treated as GST-inclusive (the normal way retail prices are
  shown to Indian consumers) — the GST amount is backed out of the price,
  not added on top.

## This update: blog / content SEO engine

- Run `npm install` (adds `marked` for Markdown rendering) and
  `supabase/migration_19_blog.sql` (new installs: already in `schema.sql`).
- **`/admin/blog`** — write posts in Markdown, with a title, optional
  category, excerpt (used for previews and meta descriptions), and an
  uploaded cover image. Draft/Publish toggle, edit, delete.
- **`/blog`** and **`/blog/[slug]`** — public listing and post pages,
  server-rendered with proper `<title>`/description metadata, Open Graph
  tags, and Article JSON-LD structured data (same pattern the product
  pages already use for their Product schema).
- Published posts are automatically included in `sitemap.xml` so Google
  can discover them without any extra step.
- This is intentionally just a content engine, not a full CMS — no
  bilingual (Odia) post support yet, no comments, no related-posts widget.
  Those would be natural follow-ups once you're actually publishing.

## This update: Q&A, FSSAI/lab certificates, referral tiers, use-case & collection pages

- Run `supabase/migration_20_qa.sql`, `migration_21_certificates.sql`,
  `migration_22_referral_tiers.sql`, and `migration_23_landing_pages.sql`
  (new installs: all already in `schema.sql`).
- **Per-product Q&A** — a "Questions & Answers" section on every product
  page. Anyone can read; asking requires sign-in. Answer from
  **`/admin/questions`** (unanswered-first filter included).
- **FSSAI/lab certificates** — upload a PDF or image per product from
  **`/admin/certificates`**; it shows as a downloadable badge on that
  product's page. Also wired the footer's FSSAI license line to
  `NEXT_PUBLIC_FSSAI_LICENSE_NUMBER` in `.env` — set it once you have the
  number and the placeholder text goes away automatically.
- **Referral tiers** — Bronze (15%) → Silver (20%, after 3 successful
  referrals) → Gold (25%, after 6). Thresholds live in
  `src/lib/referralTiers.ts` if you want to tune them. My Account →
  Referrals now shows the customer's current tier and how many more
  referrals they need for the next one.
- **Use-case & collection pages** — `/use-case/[slug]` (e.g. "best oils
  for diabetics") and `/collections/[slug]` (e.g. "Diwali gift hampers")
  are the same system under the hood, just framed differently. Build them
  from **`/admin/landing-pages`**: title, optional Markdown content, a
  cover image, and a picked set of products. `/use-case` and `/collections`
  list everything published, and all of it's in the sitemap automatically.

## This update: "Heritage Market 2.0" UI/UX makeover

A visual/UX redesign only — no changes to the backend, auth, payments, cart
logic, reviews, wishlist, membership, loyalty or the CMS. One small
addition: a real newsletter signup (run `supabase/migration_24_newsletter.sql`;
new installs already have it in `schema.sql`). No new npm packages.

**Design system** — tokens live in `tailwind.config.ts` (palette from the
brief: terracotta `red`, deep `leaf`, `turmeric`, `sand`, warm white `card`)
and reusable classes in `globals.css` (`btn-primary`, `btn-secondary`,
`badge`, `pill`, `eyebrow`, `heading-display`, `container-page`, …). React
wrappers — `Button`, `Badge`, `Pill`, `SectionHeading`, `Price`, `Rating`,
`TrustItem`, `Container`, `Divider`, `Reveal` — are in
`src/components/ui.tsx`. Prices use tabular sans (no more monospace);
monospace is kept for order IDs and nutrition metadata only.

**Homepage** (`HomeClient.tsx` + `components/home/*`) — split editorial hero →
visual category cards → Bestsellers → brand story → Shop by Need → Today's
Pantry Picks → animated Source/Process/Pack/Deliver timeline → full shop →
customer reviews → recipes → newsletter. Sections that depend on content
(Shop by Need, reviews, recipes) only render once real content exists —
nothing is invented. "Bestsellers" ranks by review volume/rating, since the
store has no sales field.

**Navigation & overlays** — new header (announcement bar, search, wishlist/
account/cart, category nav, shrinks on scroll), polished search (popular /
recent / categories / live product results; full-screen on mobile), mobile
bottom navigation, and a single global cart drawer + search overlay
(`context/UIContext.tsx`) so the cart button now works on *every* page, not
just home and product. Cart drawer has the free-delivery progress bar.

**Product experience** — image-led cards with a slide-up "Add to cart" on
desktop hover and a touch button on mobile; designed category-colour
fallback plates instead of emoji (`ProductFallback` in `ProductImage.tsx`);
sticky purchase panel and a mobile sticky add-to-cart bar on product pages;
related products; wishlist heart animation.

**Content pages** — blog, collections and use-case pages restyled as a food
journal / editorial campaign pages.

**Where to add real photography** — `src/lib/siteImages.ts`. Until photos are
uploaded, editorial sections use your real product images, so nothing is
stock or placeholder art.

**Not changed in this pass** — admin screens, and the English-only copy on
the new marketing sections (existing translated UI strings still switch to
Odia).

## This update: V3 "Signature Edition" art-direction pass

Presentation only: no changes to Supabase, auth, payments, cart, checkout or
any CMS. No new npm packages, no new migrations.

- **Hero** - overlapping product composition (one dominant, two supporting,
  ingredient shapes at two depths) with subtle cursor depth (mouse only, off
  for reduced motion). Followed by an ingredient **marquee**.
- **Homepage rhythm** - hero > marquee > pantry gallery (asymmetric) >
  Customer Favourites rail > cinematic brand story (dark, scroll-driven
  steps + drawn line) > statement moment > **Pantry Flow** (the signature
  scroll interaction) > Shop by Need mosaic > Today's Pantry Picks (hero Deal
  of the Day) > shop > reviews > journal > newsletter > footer. Sections that
  need content hide until it exists.
- **Scroll interactions are sticky-based, never scroll-jacked** - Pantry
  Flow and the brand story only read scroll position; wheel/touch scrolling
  is untouched.
- **Motion system** - `duration-fast/base/editorial`, `ease-brand`, clip
  reveal, route transition (`app/template.tsx`). All of it is switched off by
  `prefers-reduced-motion`.
- **Section headings** have three voices (commerce / editorial / statement).
- **Product page** - trust points, savings, accordions built only from data
  that exists (About, How it's made, Nutrition, Details).
- **Empty states** share one `EmptyState` component; **skeletons** live in
  `app/loading.tsx` and the collection / use-case `loading.tsx`.
- **Footer** is a brand ending. Instagram / WhatsApp / Email only appear
  once `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`,
  `NEXT_PUBLIC_CONTACT_EMAIL` are set (see `.env.example`).
- A "skip to content" link and visible focus states were added.

## This update: V4 precision pass (scale, spacing, density)

Presentation only; nothing in the data layer, cart, checkout or CMS changed.

- **Type scale** - commerce headings 26/34px, editorial 32/40/48px,
  subtitles 13/14px, Pantry Flow max 88px, Statement max 92px, hero max 72px.
- **Spacing** - `.section-pad` is `py-12 md:py-20`; heading-to-content margin
  `mb-7 md:mb-9`; brand story, statement, newsletter, footer and the Deal of
  the Day card are all tighter.
- **Galleries adapt to the CMS** - `src/components/home/compose.ts` generates
  the desktop layout for Shop the Pantry (12 columns) and Shop by Need (4
  columns) from the *actual item count*, so there are no empty grid cells at
  any count. It includes `fillsGrid()`, a placement simulator; every count
  from 1 to 14 has been checked to tile with no holes.
- **Phones/tablets** - Pantry is a swipe rail on phones and a 2-column grid on
  tablets; Shop by Need is a rail at 4+ items, compact stacked cards below that.
- **Section order** - hero, marquee, pantry, favourites, brand story, shop by
  need, pantry flow, statement, today's picks, shop, reviews, journal,
  newsletter.
