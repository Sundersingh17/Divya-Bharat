-- Blog/content posts (recipes, nutrition guides, "how it's made" pieces)
-- for organic SEO traffic — separate from product pages so there's
-- long-form content Google can index beyond the catalog itself.
-- Run once in Supabase's SQL editor. (New installs: schema.sql already
-- includes this, skip this file.)

create table if not exists blog_posts (
  id text primary key,  -- the URL slug, e.g. "5-uses-for-mustard-oil"
  title text not null,
  excerpt text,
  content text not null,  -- markdown
  cover_image_url text,
  category text,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table blog_posts enable row level security;
create policy "Published posts are public to read" on blog_posts
  for select using (published = true);
-- No public write policy — all writes go through /api/admin-blog
-- (service role), same pattern as products/coupons/offers.

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;
