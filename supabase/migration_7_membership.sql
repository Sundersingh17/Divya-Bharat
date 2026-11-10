-- Replaces the per-product "Subscribe & Save" with a single platform-wide
-- paid membership (like Zepto Gold / Amazon Prime) — free delivery + a
-- discount on everything, purchased via Razorpay. Run once in Supabase's
-- SQL editor. (New installs: schema.sql already includes this, skip this file.)

create table if not exists memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  plan text not null,                      -- 'monthly' or 'yearly'
  status text not null default 'active',   -- active, expired, cancelled
  amount_paid numeric(10,2) not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  start_date date not null default current_date,
  end_date date not null,
  created_at timestamptz not null default now()
);
alter table memberships enable row level security;
create policy "Users view their own memberships" on memberships
  for select using (auth.uid() = user_id);
-- No public insert policy on purpose — memberships are only created by
-- /api/membership/verify (service role) after a Razorpay signature check,
-- so a customer can't grant themselves membership by calling the DB directly.

-- The old per-product subscriptions table/UI is retired in favor of this.
-- Its table is left in place (harmless if unused) rather than dropped, so
-- this migration never deletes data.
