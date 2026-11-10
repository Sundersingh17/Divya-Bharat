-- migration_25_prd_hardening.sql  (ADDITIVE ONLY — safe to run on a live database)
-- Review before running in the Supabase SQL editor.

-- 1. One order per Razorpay payment (duplicate-payment protection).
--    If this fails, you have duplicate payment ids already; resolve them first.
create unique index if not exists orders_razorpay_payment_id_key
  on orders (razorpay_payment_id) where razorpay_payment_id is not null;

create unique index if not exists memberships_razorpay_payment_id_key
  on memberships (razorpay_payment_id) where razorpay_payment_id is not null;

-- 2. Variant-specific front/back product images.
--    Existing rows keep variant_id = null (they stay "shared" images shown for every size).
alter table product_images add column if not exists variant_id text references product_variants(id) on delete set null;
alter table product_images add column if not exists view text;  -- 'front' | 'back' | 'other' (null = untagged)
create index if not exists product_images_variant_idx on product_images (variant_id);
