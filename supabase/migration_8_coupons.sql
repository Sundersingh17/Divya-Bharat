-- Coupon/promo code engine. Run once in Supabase's SQL editor.
-- (New installs: schema.sql already includes this, skip this file.)

create table if not exists coupons (
  code text primary key,
  type text not null,                    -- 'percent', 'flat', 'free_shipping'
  value numeric(10,2) not null default 0, -- percent (e.g. 10) or flat rupee amount; ignored for free_shipping
  min_order_value numeric(10,2) not null default 0,
  usage_limit int,                        -- null = unlimited
  used_count int not null default 0,
  is_active boolean not null default true,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now()
);
alter table coupons enable row level security;
-- No public select policy — coupon validation happens through the
-- /api/coupons/validate route (service role), so codes and usage counts
-- aren't directly queryable/enumerable via the anon key.

alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists discount_amount numeric(10,2) not null default 0;

insert into coupons (code, type, value, min_order_value, usage_limit) values
  ('WELCOME10', 'percent', 10, 199, null),
  ('FREESHIP', 'free_shipping', 0, 299, null)
on conflict (code) do nothing;
