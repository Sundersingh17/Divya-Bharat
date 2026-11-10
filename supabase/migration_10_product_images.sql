-- Sets up Supabase Storage for real, admin-uploaded product photos —
-- replaces the old "drop a file in /public/images/products" approach
-- with an in-app upload feature. Run once in Supabase's SQL editor.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- The bucket is public, so images are readable by anyone via their direct
-- URL (needed for the storefront to display them) — but uploads only
-- happen through /api/admin-products/upload-image using the service-role
-- key (bypasses storage RLS entirely), so there's no public write policy
-- here on purpose. A customer's browser can never write to this bucket.
