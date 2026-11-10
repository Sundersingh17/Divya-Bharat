-- migration_26_extras.sql (ADDITIVE ONLY). Run in the Supabase SQL editor.

-- Restock notifications: "email me when this size is back".
create table if not exists restock_requests (
  id uuid primary key default uuid_generate_v4(),
  product_id text not null references products(id) on delete cascade,
  variant_id text not null references product_variants(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (variant_id, email)
);
alter table restock_requests enable row level security;  -- no public policies: server (service role) only

-- Delivery PIN-code serviceability. Empty table = the checker stays hidden.
create table if not exists delivery_pincodes (
  pincode text primary key check (pincode ~ '^[0-9]{6}$'),
  min_days int not null check (min_days >= 0),
  max_days int not null check (max_days >= min_days),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table delivery_pincodes enable row level security;  -- server (service role) only
