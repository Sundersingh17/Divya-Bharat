-- Phase 2 features: reviews & ratings, wishlist, subscribe & save,
-- combo/bundle kits. Run this once in Supabase's SQL editor.
-- (New installs: schema.sql already includes this, skip this file.)

-- ---------- reviews ----------
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id text references products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review_text text,
  is_verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
alter table reviews enable row level security;
create policy "Reviews are public to read" on reviews for select using (true);
-- Inserts go through the /api/reviews route (service role) so verified-
-- purchase status can be checked server-side rather than trusted from
-- the client — there is deliberately no public insert policy here.

-- ---------- wishlist ----------
create table if not exists wishlist_items (
  user_id uuid references auth.users(id) on delete cascade,
  product_id text references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table wishlist_items enable row level security;
create policy "Users manage their own wishlist" on wishlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- subscribe & save ----------
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id text references products(id) on delete cascade,
  frequency_days int not null default 30,
  discount_pct int not null default 10,
  status text not null default 'active', -- active, paused, cancelled
  next_order_date date not null default (current_date + 30),
  created_at timestamptz not null default now()
);
alter table subscriptions enable row level security;
create policy "Users manage their own subscriptions" on subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- combo/bundle kits ----------
-- Bundles are stored as regular products (category_id = 'bundles') so
-- cart, checkout, and orders all work with zero special-casing.
-- bundle_items just records what's inside, for display purposes.
create table if not exists bundle_items (
  bundle_id text references products(id) on delete cascade,
  product_id text references products(id),
  qty int not null default 1,
  primary key (bundle_id, product_id)
);
alter table bundle_items enable row level security;
create policy "Bundle contents are public to read" on bundle_items for select using (true);

insert into categories (id, name, sort_order) values ('bundles', 'Combo Kits', 0)
on conflict (id) do nothing;

insert into products (id, name, name_odia, category_id, description, price, mrp, pack_size) values
  ('combo-breakfast-kit', 'Odisha Breakfast Kit', 'ଓଡ଼ିଶା ଜଳଖିଆ କିଟ', 'bundles',
   'Everything for a traditional Odia breakfast — mustard oil, chickpea chhatua, and millet papad, bundled at a discount.',
   349, 437, '3-item kit'),
  ('combo-cooking-essentials', 'Cooking Essentials Kit', 'ରୋଷେଇ ଆବଶ୍ୟକୀୟ କିଟ', 'bundles',
   'The core spices every kitchen needs — turmeric, chilli, and jeera powder, bundled at a discount.',
   199, 229, '3-item kit')
on conflict (id) do nothing;

insert into bundle_items (bundle_id, product_id, qty) values
  ('combo-breakfast-kit', 'mustard-oil', 1),
  ('combo-breakfast-kit', 'chickpea-chhatua', 1),
  ('combo-breakfast-kit', 'milet-papad', 1),
  ('combo-cooking-essentials', 'turmeric-powder', 1),
  ('combo-cooking-essentials', 'chilli-powder', 1),
  ('combo-cooking-essentials', 'jeera-powder', 1)
on conflict (bundle_id, product_id) do nothing;

-- ---------- aggregate rating view (for product grid star ratings) ----------
create or replace view product_ratings as
  select product_id, avg(rating)::numeric(2,1) as avg_rating, count(*) as review_count
  from reviews
  group by product_id;
