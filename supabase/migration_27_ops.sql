-- migration_27_ops.sql (ADDITIVE). Run in the Supabase SQL editor.

-- Operational events for the Admin → Health page (payment mismatches, failed emails, order errors, low stock).
create table if not exists system_events (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists system_events_type_time on system_events (type, created_at desc);
alter table system_events enable row level security;  -- server (service role) only

-- Atomic stock handling: the UPDATE only succeeds if enough stock remains,
-- so two customers can never both buy the last unit.
alter table orders add column if not exists stock_reserved boolean not null default false;

create or replace function reserve_stock(p_variant_id text, p_qty int) returns boolean
language plpgsql as $$
declare n int;
begin
  update product_variants set stock_qty = stock_qty - p_qty
   where id = p_variant_id and stock_qty >= p_qty;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function release_stock(p_variant_id text, p_qty int) returns void
language sql as $$
  update product_variants set stock_qty = stock_qty + p_qty where id = p_variant_id;
$$;

-- Only the server (service role) may call these — never the public API.
revoke execute on function reserve_stock(text, int) from public, anon, authenticated;
revoke execute on function release_stock(text, int) from public, anon, authenticated;
