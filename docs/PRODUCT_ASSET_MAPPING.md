# Product asset mapping

Generated while integrating the supplied photography. The database stays the source of truth: nothing here changes product, price, variant or stock data.

## How images are wired

- Storage: existing Supabase bucket `product-images`; links: existing `product_images` table (`product_id`, `variant_id`, `view`).
- Optimised files live in `assets/product-images/` (1600px WebP, ~10 MB total for all 50) with `manifest.json`. They are **not** in `public/`, so they are not shipped in the site bundle.
- `scripts/upload-product-images.mjs` uploads them and inserts the `product_images` rows. It is a **dry run unless `--apply`**, never deletes or overwrites, skips anything that already exists, and tags each photo with the product's real default variant (looked up in the DB).
- It also uploads `<product-id>.jpg` (600px) only if absent: the cart, search and wishlist thumbnails use that legacy filename.
- Display order for a selected pack size: that variant's own photos -> shared photos -> default-variant photos -> any photo of the same product -> legacy file -> category placeholder. A photo of another product is never used.

## Confirmed matches (25 products, front + back each)

Match basis: the product name printed on the pack in each photo, checked against the product ids in `supabase/schema.sql`. Pack size on the label equals the seeded default pack size in every case.

| Product id | Default pack | Front (source) | Back (source) | Storage paths |
|---|---|---|---|---|
| groundnut-oil | 500 ml | 5cf511b3-image.png | c20d410c-image.png | `groundnut-oil-front.webp`, `groundnut-oil-back.webp` |
| coconut-oil | 500 ml | 9d9b29c0-image.png | e354851e-image.png | `coconut-oil-front.webp`, `coconut-oil-back.webp` |
| mustard-oil | 500 ml | 2c1d6903-image.png | 39ff1667-image.png | `mustard-oil-front.webp`, `mustard-oil-back.webp` |
| sesame-oil | 250 ml | 3f298cdd-image.png | d4d36449-image.png | `sesame-oil-front.webp`, `sesame-oil-back.webp` |
| sunflower-oil | 500 ml | b6446267-image.png | ffa051a1-image.png | `sunflower-oil-front.webp`, `sunflower-oil-back.webp` |
| mix-chhatua-sugar | 500 g | b78be282-image.png | 10a09c66-image.png | `mix-chhatua-sugar-front.webp`, `mix-chhatua-sugar-back.webp` |
| ragi-chhatua | 500 g | 127ec49e-image.png | 61ae9a49-image.png | `ragi-chhatua-front.webp`, `ragi-chhatua-back.webp` |
| chickpea-chhatua | 500 g | af80e0cf-image.png | f7b8e1a2-image.png | `chickpea-chhatua-front.webp`, `chickpea-chhatua-back.webp` |
| special-chhatua | 500 g | 17b897c5-image.png | 3ca5d2f3-image.png | `special-chhatua-front.webp`, `special-chhatua-back.webp` |
| mix-chhatua-nosugar | 500 g | 9349b1fa-image.png | 992cccea-image.png | `mix-chhatua-nosugar-front.webp`, `mix-chhatua-nosugar-back.webp` |
| multigrain-aata | 1 kg | f3ff97fc-image.png | 7de9b41a-image.png | `multigrain-aata-front.webp`, `multigrain-aata-back.webp` |
| besan | 500 g | 300205ab-image.png | 6d6b5020-image.png | `besan-front.webp`, `besan-back.webp` |
| turmeric-powder | 200 g | c19e5531-image.png | 415f09a5-image.png | `turmeric-powder-front.webp`, `turmeric-powder-back.webp` |
| chilli-powder | 200 g | 6281cfab-image.jpg | 7c52eaf1-image.png | `chilli-powder-front.webp`, `chilli-powder-back.webp` |
| jeera-powder | 200 g | 85d15e25-image.png | 8d6b6d62-image.png | `jeera-powder-front.webp`, `jeera-powder-back.webp` |
| triphala-churna | 200 g | b26c4d22-image.png | 49904d13-image.png | `triphala-churna-front.webp`, `triphala-churna-back.webp` |
| moong-dal | 500 g | c8bdb855-image.png | bb2f4005-image.png | `moong-dal-front.webp`, `moong-dal-back.webp` |
| blackgram-dal | 500 g | e81b9b9a-image.png | db8fa71d-image.png | `blackgram-dal-front.webp`, `blackgram-dal-back.webp` |
| splitchickpea-dal | 500 g | cd11c422-image.png | d4c41823-image.png | `splitchickpea-dal-front.webp`, `splitchickpea-dal-back.webp` |
| blackgram-wadi | 250 g | 0d49b9fa-image.png | 21a067e1-image.png | `blackgram-wadi-front.webp`, `blackgram-wadi-back.webp` |
| milet-papad | 200 g | 67ef4ca6-image.png | c9a81325-image.png | `milet-papad-front.webp`, `milet-papad-back.webp` |
| mustard-pidia | 200 g | 52dbb4b8-image.png | 9b07631d-image.png | `mustard-pidia-front.webp`, `mustard-pidia-back.webp` |
| lemongrass-tea | 100 g | a0caf771-image.png | f161ca6b-image.png | `lemongrass-tea-front.webp`, `lemongrass-tea-back.webp` |
| combo-cooking-essentials | 3-item kit | 09644b78-image.png | 3167c69f-image.png | `combo-cooking-essentials-front.webp`, `combo-cooking-essentials-back.webp` |
| combo-breakfast-kit | 3-item kit | 76e88680-image.png | 97ddf433-image.png | `combo-breakfast-kit-front.webp`, `combo-breakfast-kit-back.webp` |

## Missing mappings (documented, not invented)

No photo was supplied for any **non-default pack size**. These variants fall back to their product's primary photo, with an on-page note that the photo shows the standard pack:

- Oils: Mustard / Coconut / Groundnut / Sunflower 250 ml and 1 L; Sesame 500 ml. (The PRD example of three Mustard Oil pack photos can't be met: only the 500 ml pack was photographed.)
- Chickpea & Ragi Chhatua 250 g / 1 kg; Multi Grain Aata 500 g / 2 kg; Besan 1 kg; Moong, Black Gram, Split Chickpea Dal 250 g / 1 kg; Turmeric, Chilli, Jeera 100 g.
- Not photographed at all: nothing; every active product has a front and back image.

## Duplicates

- `c20d410c-image.png`, `fdf4e02e-image.png` and `GroundNut Oil Back.png` (inside the project zip) are byte-identical (Groundnut Oil back). One copy is used.

## Uncertain / needs your decision

- **Generator watermark**: the visible four-point sparkle in the bottom-right corner of the 2048px photos was removed by reversing its constant ~50% white overlay (restores the real texture underneath, no blur patch). All 49 affected files are clean; the 1024px chilli front never had one. Note: this removes the *visible* mark only; any invisible provenance watermark embedded by the generator (e.g. SynthID) is not touched.
- **Chilli Powder front** (`6281cfab-image.jpg`) is 1024x1024 JPEG; all others are 2048x2048 PNG. It is usable but softer; a 2048px version is recommended.
- **Label text inside the photos** is AI-rendered and includes errors: e.g. Besan back label shows a `+1` phone number, an email `nniantalar@gmail.com.in` and the line `Manufactured By: 4 Bharat.7412`; some small logo captions are garbled; batch/mfg dates and the FSSAI number appear as printed text. None of it was used as site data, but customers can read it when they open the back photo. Please review each back image before publishing, especially for FSSAI compliance.
- **Printed MRPs** on the packs were not reconciled with database prices (spot checks matched the seeded MRPs; a full reconciliation was not done).
- Product `milet-papad` / name `Milet Papad` is spelled with one `l` in the database; the pack reads `Millet Papad`. Left unchanged.
- Combo kits: the box photos show the printed combo prices (Cooking Essentials 229 -> 199, Breakfast 437 -> 349), which equal the seeded kit price/MRP.

## Brand assets

- Logo: `55a4fbb7-image.png` (2048x2048 emblem on ivory) -> circular transparent PNG `public/brand/logo.png` (1024), `logo-512.png`; the cut-out was masked by hand-fitted circle, so a vector/original transparent file would be better for print.
- Icons: `src/app/icon.png`, `src/app/apple-icon.png`, `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`. The old `icon.svg` (letters "DB") was removed.

## Full inventory of supplied files (52)

Original filenames were generic hashes (the upload did not carry meaningful names); the first 8 hex characters identify each.

| # | File | Format | Dimensions | Size (MB) | Product | Type |
|---|---|---|---|---|---|---|
| 0 | c20d410c-image.png | PNG | 2048x2048 | 6.9 | groundnut-oil | back |
| 1 | 5cf511b3-image.png | PNG | 2048x2048 | 6.8 | groundnut-oil | front |
| 2 | e354851e-image.png | PNG | 2048x2048 | 6.9 | coconut-oil | back |
| 3 | 9d9b29c0-image.png | PNG | 2048x2048 | 7.1 | coconut-oil | front |
| 4 | 39ff1667-image.png | PNG | 2048x2048 | 6.6 | mustard-oil | back |
| 5 | 2c1d6903-image.png | PNG | 2048x2048 | 6.7 | mustard-oil | front |
| 6 | 55a4fbb7-image.png | PNG | 2048x2048 | 9.1 | (brand) | logo |
| 7 | b78be282-image.png | PNG | 2048x2048 | 6.8 | mix-chhatua-sugar | front |
| 8 | 61ae9a49-image.png | PNG | 2048x2048 | 7.9 | ragi-chhatua | back |
| 9 | 127ec49e-image.png | PNG | 2048x2048 | 8.1 | ragi-chhatua | front |
| 10 | f7b8e1a2-image.png | PNG | 2048x2048 | 7.9 | chickpea-chhatua | back |
| 11 | af80e0cf-image.png | PNG | 2048x2048 | 8.2 | chickpea-chhatua | front |
| 12 | d4d36449-image.png | PNG | 2048x2048 | 6.8 | sesame-oil | back |
| 13 | 3f298cdd-image.png | PNG | 2048x2048 | 6.7 | sesame-oil | front |
| 14 | ffa051a1-image.png | PNG | 2048x2048 | 6.6 | sunflower-oil | back |
| 15 | b6446267-image.png | PNG | 2048x2048 | 6.7 | sunflower-oil | front |
| 16 | fdf4e02e-image.png | PNG | 2048x2048 | 6.9 | groundnut-oil | back (duplicate) |
| 17 | 10a09c66-image.png | PNG | 2048x2048 | 6.9 | mix-chhatua-sugar | back |
| 18 | bb2f4005-image.png | PNG | 2048x2048 | 8.3 | moong-dal | back |
| 19 | c8bdb855-image.png | PNG | 2048x2048 | 8.1 | moong-dal | front |
| 20 | 49904d13-image.png | PNG | 2048x2048 | 7.1 | triphala-churna | back |
| 21 | b26c4d22-image.png | PNG | 2048x2048 | 7.4 | triphala-churna | front |
| 22 | 8d6b6d62-image.png | PNG | 2048x2048 | 7.7 | jeera-powder | back |
| 23 | 85d15e25-image.png | PNG | 2048x2048 | 7.6 | jeera-powder | front |
| 24 | 7c52eaf1-image.png | PNG | 2048x2048 | 7.7 | chilli-powder | back |
| 25 | 415f09a5-image.png | PNG | 2048x2048 | 8.4 | turmeric-powder | back |
| 26 | c19e5531-image.png | PNG | 2048x2048 | 8.2 | turmeric-powder | front |
| 27 | 6d6b5020-image.png | PNG | 2048x2048 | 7.6 | besan | back |
| 28 | 300205ab-image.png | PNG | 2048x2048 | 7.7 | besan | front |
| 29 | 7de9b41a-image.png | PNG | 2048x2048 | 7.7 | multigrain-aata | back |
| 30 | f3ff97fc-image.png | PNG | 2048x2048 | 7.9 | multigrain-aata | front |
| 31 | 3ca5d2f3-image.png | PNG | 2048x2048 | 7.3 | special-chhatua | back |
| 32 | 17b897c5-image.png | PNG | 2048x2048 | 7.4 | special-chhatua | front |
| 33 | 992cccea-image.png | PNG | 2048x2048 | 7.2 | mix-chhatua-nosugar | back |
| 34 | 9349b1fa-image.png | PNG | 2048x2048 | 7.8 | mix-chhatua-nosugar | front |
| 35 | 6281cfab-image.jpg | JPEG | 1024x1024 | 0.2 | chilli-powder | front |
| 36 | 3167c69f-image.png | PNG | 2048x2048 | 7.4 | combo-cooking-essentials | back |
| 37 | 09644b78-image.png | PNG | 2048x2048 | 7.8 | combo-cooking-essentials | front |
| 38 | 97ddf433-image.png | PNG | 2048x2048 | 7.7 | combo-breakfast-kit | back |
| 39 | 76e88680-image.png | PNG | 2048x2048 | 7.7 | combo-breakfast-kit | front |
| 40 | f161ca6b-image.png | PNG | 2048x2048 | 7.1 | lemongrass-tea | back |
| 41 | a0caf771-image.png | PNG | 2048x2048 | 7.0 | lemongrass-tea | front |
| 42 | 9b07631d-image.png | PNG | 2048x2048 | 8.0 | mustard-pidia | back |
| 43 | 52dbb4b8-image.png | PNG | 2048x2048 | 8.2 | mustard-pidia | front |
| 44 | c9a81325-image.png | PNG | 2048x2048 | 8.8 | milet-papad | back |
| 45 | 67ef4ca6-image.png | PNG | 2048x2048 | 8.8 | milet-papad | front |
| 46 | 21a067e1-image.png | PNG | 2048x2048 | 8.0 | blackgram-wadi | back |
| 47 | 0d49b9fa-image.png | PNG | 2048x2048 | 8.1 | blackgram-wadi | front |
| 48 | d4c41823-image.png | PNG | 2048x2048 | 7.5 | splitchickpea-dal | back |
| 49 | cd11c422-image.png | PNG | 2048x2048 | 7.3 | splitchickpea-dal | front |
| 50 | db8fa71d-image.png | PNG | 2048x2048 | 7.6 | blackgram-dal | back |
| 51 | e81b9b9a-image.png | PNG | 2048x2048 | 7.6 | blackgram-dal | front |


## Card-size copies
Each photo also has a 640px `<id>-<view>-card.webp` (~42 KB) in `assets/product-images/`. The upload script uploads them next to the full images (no DB rows). Product cards request the card copy and fall back to the full image automatically if it is missing.
