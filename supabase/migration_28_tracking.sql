-- migration_28_tracking.sql (ADDITIVE). Courier + tracking details shown to customers.
alter table orders add column if not exists courier text;
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists tracking_url text;
