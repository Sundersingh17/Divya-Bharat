-- Run this in Supabase's SQL editor if your orders table already exists.
-- (New installs: schema.sql already includes this column, skip this file.)

alter table orders add column if not exists email text;
