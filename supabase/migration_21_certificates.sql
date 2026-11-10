-- Per-product lab test reports / FSSAI certificates, shown as downloads
-- on the product page — builds trust the way a physical shop showing a
-- lab report on the counter would. Publicly readable by design (these
-- are meant to be seen), only admin-writable.
-- Run once in Supabase's SQL editor. (New installs: schema.sql already
-- includes this, skip this file.)

create table if not exists product_certificates (
  id uuid primary key default uuid_generate_v4(),
  product_id text references products(id) on delete cascade,
  title text not null,
  file_url text not null,
  uploaded_at timestamptz not null default now()
);
alter table product_certificates enable row level security;
create policy "Certificates are public to read" on product_certificates for select using (true);
-- No public write policy — uploads go through /api/admin-certificates.

insert into storage.buckets (id, name, public)
values ('product-certificates', 'product-certificates', true)
on conflict (id) do nothing;
