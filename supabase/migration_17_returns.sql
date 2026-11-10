-- Return/refund requests, with optional photo evidence, tied to a
-- Delivered order. No public RLS policies — every read/write goes
-- through /api/returns (customer, phone- or session-verified) or
-- /api/admin-returns (admin), both using the service role, the same
-- pattern orders and coupons already use.
-- Run once in Supabase's SQL editor. (New installs: schema.sql already
-- includes this, skip this file.)

create table if not exists return_requests (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  comments text,
  photo_urls text[] not null default '{}',
  status text not null default 'Requested', -- Requested, Approved, Rejected, Refunded
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table return_requests enable row level security;

insert into storage.buckets (id, name, public)
values ('return-photos', 'return-photos', true)
on conflict (id) do nothing;
