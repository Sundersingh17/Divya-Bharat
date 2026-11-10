-- Referral program. Run once in Supabase's SQL editor.
-- (New installs: schema.sql already includes this, skip this file.)

create table if not exists referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text unique not null,
  created_at timestamptz not null default now()
);
alter table referral_codes enable row level security;
create policy "Users view their own referral code" on referral_codes
  for select using (auth.uid() = user_id);
-- No public insert policy — codes are only created through
-- /api/referral/code (service role), so a user can't assign themselves
-- an arbitrary/guessable code.

create table if not exists referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_user_id uuid references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete cascade unique,
  referred_order_id text references orders(id),
  reward_issued boolean not null default false,
  reward_coupon_code text,
  created_at timestamptz not null default now()
);
alter table referrals enable row level security;
create policy "Users view referrals they made" on referrals
  for select using (auth.uid() = referrer_user_id);
-- No public insert policy — referrals are only recorded through
-- /api/referral/track (service role) after verifying the referred user's
-- order is genuinely their first, so this can't be gamed by calling the
-- table directly.
