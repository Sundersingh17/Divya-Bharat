-- Run this in Supabase's SQL editor if you already ran schema.sql before —
-- it adds payment tracking columns without touching your existing data.
-- (New installs: schema.sql already includes these columns, skip this file.)

alter table orders add column if not exists payment_status text not null default 'pending';
alter table orders add column if not exists razorpay_order_id text;
alter table orders add column if not exists razorpay_payment_id text;
