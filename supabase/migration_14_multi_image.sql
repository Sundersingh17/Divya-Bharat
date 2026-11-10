-- Multiple photos per product (front, back, angles, etc.), replacing the
-- old single-fixed-filename image approach. Run once in Supabase's SQL
-- editor. (New installs: schema.sql already includes this, skip this file.)

create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id text references products(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table product_images enable row level security;
create policy "Product images are public to read" on product_images for select using (true);
-- No public insert/update/delete policy — images are only managed
-- through /api/admin-products/upload-image (service role), same pattern
-- as everything else in /admin.

-- Note: if you already had single photos uploaded under the old scheme
-- (a file literally named "<product-id>.jpg" in the product-images
-- bucket), those keep working automatically — the storefront falls back
-- to that exact filename if a product has no rows in product_images yet.
-- No need to re-upload anything that's already showing correctly.
