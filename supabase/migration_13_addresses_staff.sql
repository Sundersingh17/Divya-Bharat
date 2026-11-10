-- Saved delivery addresses + staff admin accounts. Run once in
-- Supabase's SQL editor. (New installs: schema.sql already includes
-- this, skip this file.)

-- ---------- saved addresses ----------
create table if not exists addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table addresses enable row level security;
create policy "Users manage their own addresses" on addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- staff admin accounts ----------
-- Lets specific customer accounts (signed in via the normal phone/email
-- OTP flow) also access /admin, with a role, instead of everyone sharing
-- one password. The shared ADMIN_PASSWORD still works as a bootstrap/
-- fallback method — see src/lib/adminAuth.ts.
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'staff',   -- 'owner' or 'staff'
  added_at timestamptz not null default now()
);
alter table admin_users enable row level security;
-- No public policy at all — this table is only ever read via the
-- service-role key inside checkAdminAuth(), never queried from the
-- browser, so staff role assignment can't be tampered with client-side.

-- To make yourself the first owner (do this once, replace the email):
-- insert into admin_users (user_id, role)
-- select id, 'owner' from auth.users where email = 'you@example.com';

-- ---------- profile avatar storage ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
