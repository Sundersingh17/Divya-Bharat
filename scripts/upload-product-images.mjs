// Uploads the optimised product photos in assets/product-images to the
// existing Supabase "product-images" bucket and links them in the existing
// product_images table (product_id, variant_id, view).
//
// Safe by design:
//   - DRY RUN unless you pass --apply
//   - never deletes or overwrites: existing storage objects/rows are skipped
//   - uses each product's real default variant from the database
//
// Usage (from the project root, with .env.local containing
// NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
//   node --env-file=.env.local scripts/upload-product-images.mjs          # preview
//   node --env-file=.env.local scripts/upload-product-images.mjs --apply  # do it
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const APPLY = process.argv.includes("--apply");
// --overwrite: replace photos that are already in storage (use this to swap in the watermark-free versions)
const OVERWRITE = process.argv.includes("--overwrite");
const BUCKET = "product-images";
const DIR = "assets/product-images";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const manifest = JSON.parse(readFileSync(join(DIR, "manifest.json"), "utf8"));

const { data: products, error: pe } = await sb.from("products").select("id");
if (pe) throw pe;
const { data: variants, error: ve } = await sb.from("product_variants").select("id, product_id, pack_size, is_default");
if (ve) throw ve;
const { data: rows, error: re } = await sb.from("product_images").select("storage_path, product_id, variant_id, view");
if (re) throw new Error(`product_images query failed (is migration_25 applied?): ${re.message}`);
const { data: objs, error: oe } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
if (oe) throw oe;

const productIds = new Set(products.map((p) => p.id));
const defaultVariant = new Map();
for (const v of variants) if (v.is_default || !defaultVariant.has(v.product_id)) defaultVariant.set(v.product_id, v);
const haveObject = new Set(objs.map((o) => o.name));
const haveRow = new Set(rows.map((r) => r.storage_path));

const report = { uploaded: 0, linked: 0, skippedExisting: 0, missingProduct: [] };
async function upload(path, file, contentType) {
  if (haveObject.has(path) && !OVERWRITE) { report.skippedExisting++; console.log(`  = exists, skipped: ${path}`); return; }
  console.log(`  + ${haveObject.has(path) ? "replace" : "upload"} ${path}`);
  if (!APPLY) return;
  const { error } = await sb.storage.from(BUCKET).upload(path, readFileSync(file), { contentType, upsert: OVERWRITE, cacheControl: "300" });
  if (error) throw error;
  report.uploaded++;
}

for (const m of manifest) {
  if (!productIds.has(m.product_id)) { report.missingProduct.push(m.product_id); console.log(`! no product "${m.product_id}" in DB — skipped`); continue; }
  const dv = defaultVariant.get(m.product_id);
  console.log(`${m.product_id} [${m.view}] -> variant ${dv?.id ?? "(none)"} (${dv?.pack_size ?? "?"})`);
  await upload(m.storage_path, join(DIR, m.file), "image/webp");
  // 640px card-size copy (no DB row): product cards fetch this and fall back to the full image if it is missing
  if (m.card_file && existsSync(join(DIR, m.card_file))) await upload(m.card_file, join(DIR, m.card_file), "image/webp");
  if (!haveRow.has(m.storage_path)) {
    console.log(`  + link row ${m.storage_path}`);
    if (APPLY) {
      const { error } = await sb.from("product_images").insert({
        product_id: m.product_id, storage_path: m.storage_path, sort_order: m.view === "front" ? 0 : 1,
        variant_id: dv?.id ?? null, view: m.view
      });
      if (error) throw error;
      report.linked++;
    }
  }
  if (m.view === "front") {
    // legacy <product-id>.jpg: used by cart / search / wishlist thumbnails
    const legacy = join(DIR, "legacy", `${m.product_id}.jpg`);
    if (existsSync(legacy)) await upload(`${m.product_id}.jpg`, legacy, "image/jpeg");
  }
}
// ---- optional transparent cut-outs (make the 3D packs true standees) ----
// Put files named <product-id>-front.png and <product-id>-back.png (transparent
// background) in assets/cutouts/. They are stored as <id>-front-cut.webp /
// <id>-back-cut.webp. PNG -> WebP conversion needs the "sharp" package
// (npm i -D sharp); ready-made .webp files are uploaded as they are.
const CUT_DIR = "assets/cutouts";
if (existsSync(CUT_DIR)) {
  let sharp = null;
  try { sharp = (await import("sharp")).default; } catch {}
  for (const f of readdirSync(CUT_DIR)) {
    const m = f.match(/^(.+)-(front|back)(?:-cut)?\.(png|webp)$/i);
    if (!m) { console.log(`  ? ignored (name not recognised): ${f}`); continue; }
    const [, pid, view, ext] = m;
    if (!productIds.has(pid)) { report.missingProduct.push(pid); console.log(`  ! no such product: ${pid}`); continue; }
    const target = `${pid}-${view}-cut.webp`;
    let buf = readFileSync(join(CUT_DIR, f));
    if (ext.toLowerCase() === "png") {
      if (!sharp) { console.log(`  ! ${f}: install sharp (npm i -D sharp) to convert PNG, or supply .webp`); continue; }
      buf = await sharp(buf).resize({ height: 1200, withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    }
    if (haveObject.has(target) && !OVERWRITE) { report.skippedExisting++; console.log(`  = exists, skipped: ${target}`); continue; }
    console.log(`  + cut-out ${target}`);
    if (APPLY) {
      const { error } = await sb.storage.from(BUCKET).upload(target, buf, { contentType: "image/webp", upsert: OVERWRITE, cacheControl: "300" });
      if (error) console.log(`    ! ${error.message}`); else report.uploaded++;
    }
  }
}
console.log(APPLY ? "\nDONE" : "\nDRY RUN — nothing changed. Re-run with --apply.", report);
