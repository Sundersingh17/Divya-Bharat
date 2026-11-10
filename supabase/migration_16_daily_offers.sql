-- Daily offers: an admin-curated set of products/variants at a special
-- price "for today", plus one of them optionally flagged as the featured
-- "Deal of the Day". Deliberately simple (no start/end scheduling, no
-- automatic expiry) — the admin just adds an offer when they want to run
-- one and turns it off when they're done, the same way a local general
-- store decides day to day what's on discount. Time-boxed/scheduled flash
-- sales (with start/end timestamps) were considered and intentionally
-- deferred — this table can grow into that later without a redesign.
-- Run once in Supabase's SQL editor. (New installs: schema.sql already
-- includes this, skip this file.)

create table if not exists daily_offers (
  id uuid primary key default uuid_generate_v4(),
  product_id text not null references products(id) on delete cascade,
  variant_id text not null references product_variants(id) on delete cascade,
  offer_price numeric not null,
  is_deal_of_the_day boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table daily_offers enable row level security;
create policy "Active daily offers are public to read" on daily_offers
  for select using (active = true);
-- No public insert/update/delete policy — offers are only managed
-- through /api/admin-offers (service role), same pattern as coupons.

-- Only one offer can be "today's Deal of the Day" at a time. Postgres
-- partial unique indexes only count rows matching the WHERE clause, so
-- this allows any number of non-deal offers alongside exactly one deal.
create unique index if not exists daily_offers_single_deal
  on daily_offers (is_deal_of_the_day)
  where is_deal_of_the_day = true and active = true;
