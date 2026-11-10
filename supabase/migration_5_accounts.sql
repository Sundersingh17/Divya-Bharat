-- Run this in Supabase's SQL editor to add customer account support.
-- (New installs: schema.sql already includes this, skip this file.)

-- Ties an order to a logged-in customer. Nullable — guest checkout
-- (no login) still works, those orders just won't show up in the
-- logged-in "My Account" order history.
alter table orders add column if not exists user_id uuid references auth.users(id);

-- IMPORTANT SECURITY FIX: the original schema had an overly permissive
-- policy ("using (true)") that let anyone query any order via the anon
-- key if they could guess a phone number. Replace it with a policy that
-- only allows a logged-in user to see their own orders directly.
drop policy if exists "Customers can view orders by phone" on orders;

create policy "Users can view their own orders" on orders
  for select using (auth.uid() = user_id);

drop policy if exists "Order items are viewable" on order_items;
create policy "Users can view their own order items" on order_items
  for select using (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );

drop policy if exists "Status history is viewable" on order_status_history;
create policy "Users can view their own order status history" on order_status_history
  for select using (
    exists (select 1 from orders where orders.id = order_status_history.order_id and orders.user_id = auth.uid())
  );

-- Guest order lookup (no login) still works through the /api/orders
-- route, which uses the service-role key server-side and is rate-limited
-- — it deliberately bypasses these policies rather than relaxing them.
