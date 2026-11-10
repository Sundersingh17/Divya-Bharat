-- Per-product Q&A. Questions are publicly visible as soon as they're
-- asked (answered or not, same as most marketplaces) — only the answer
-- itself is admin-only to write.
-- Run once in Supabase's SQL editor. (New installs: schema.sql already
-- includes this, skip this file.)

create table if not exists product_questions (
  id uuid primary key default uuid_generate_v4(),
  product_id text references products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table product_questions enable row level security;
create policy "Questions are public to read" on product_questions for select using (true);
-- No public insert/update policy — asking goes through /api/questions
-- (requires a signed-in user), answering through /api/admin-questions.
