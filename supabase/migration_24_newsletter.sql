-- Newsletter/email signups from the homepage CTA. Minimal by design —
-- just an email and when they joined. No public read policy: capturing
-- emails is open (rate-limited via /api/newsletter), but reading the
-- list is admin-only (export via Supabase's own table view for now).
-- Run once in Supabase's SQL editor. (New installs: schema.sql already
-- includes this, skip this file.)

create table if not exists newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table newsletter_subscribers enable row level security;
-- No select/insert policies — writes go through /api/newsletter (service
-- role); there is deliberately no public read policy for an email list.
