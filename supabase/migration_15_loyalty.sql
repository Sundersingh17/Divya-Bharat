-- Loyalty points: earn on every order, redeem for a discount on a future
-- one. Ledger-based (not a single balance column) so it's auditable and
-- easy to reverse if an order is cancelled. Run once in Supabase's SQL
-- editor. (New installs: schema.sql already includes this, skip this file.)

create table if not exists loyalty_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  order_id text references orders(id),
  points int not null,              -- positive = earned, negative = redeemed/reversed
  reason text not null,             -- 'earned', 'redeemed', 'reversed'
  created_at timestamptz not null default now()
);
alter table loyalty_transactions enable row level security;
create policy "Users view their own loyalty transactions" on loyalty_transactions
  for select using (auth.uid() = user_id);
-- No public insert policy — points are only ever written by the order
-- API routes and the admin cancellation handler (service role), so a
-- customer can't grant themselves points by calling the table directly.

-- Running balance per user, for a quick lookup without summing the whole
-- ledger client-side every time.
--
-- security_invoker = true is important here: without it, this view would
-- run with the elevated permissions of whoever created it (bypassing the
-- loyalty_transactions RLS policy above) and could leak every user's
-- balance to any authenticated client. With it, the view respects RLS
-- as if the querying user ran the underlying query themselves — so a
-- customer querying this view only ever gets their own balance back.
create or replace view loyalty_balances
  with (security_invoker = true) as
  select user_id, sum(points) as balance
  from loyalty_transactions
  group by user_id;
