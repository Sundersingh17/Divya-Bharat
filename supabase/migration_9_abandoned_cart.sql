-- Abandoned cart recovery. Since carts live only in the browser
-- (localStorage), the server has no visibility into them by default —
-- this table captures a snapshot the moment someone types an email at
-- checkout (even if they don't finish), so a reminder can be sent later.
-- Run once in Supabase's SQL editor. (New installs: schema.sql already
-- includes this, skip this file.)

create table if not exists cart_snapshots (
  id uuid primary key default uuid_generate_v4(),
  token text unique not null,
  user_id uuid references auth.users(id),
  email text not null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  reminded_at timestamptz,
  converted boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table cart_snapshots enable row level security;
-- No public select/insert policy on purpose — snapshots are only written
-- and read through service-role API routes (/api/cart-snapshot and the
-- cron job), never queried directly with the anon key.
