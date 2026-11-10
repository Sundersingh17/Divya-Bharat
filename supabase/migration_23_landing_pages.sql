-- Use-case pages (/use-case/[slug], e.g. "cooking-oil-for-diabetics")
-- and collection pages (/collections/[slug], e.g. "diwali-gift-hampers")
-- share the same shape — a slug, some editorial copy, and a curated list
-- of products — so one table covers both, distinguished by `type`.
-- Run once in Supabase's SQL editor. (New installs: schema.sql already
-- includes this, skip this file.)

create table if not exists landing_pages (
  id text primary key,  -- the URL slug
  type text not null check (type in ('use-case', 'collection')),
  title text not null,
  subtitle text,
  content text,  -- markdown, optional longer editorial content
  product_ids text[] not null default '{}',
  cover_image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table landing_pages enable row level security;
create policy "Published landing pages are public to read" on landing_pages
  for select using (published = true);
-- No public write policy — all writes go through /api/admin-landing-pages.

insert into storage.buckets (id, name, public)
values ('landing-images', 'landing-images', true)
on conflict (id) do nothing;
