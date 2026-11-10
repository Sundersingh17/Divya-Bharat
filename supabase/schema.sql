-- Divya Bharat Food Processing Centre — database schema
-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run

create extension if not exists "uuid-ossp";

-- ---------- categories ----------
create table if not exists categories (
  id text primary key,
  name text not null,
  sort_order int not null default 0
);

-- ---------- products ----------
create table if not exists products (
  id text primary key,
  name text not null,
  name_odia text not null,
  category_id text references categories(id),
  description text,
  price numeric(10,2) not null,
  mrp numeric(10,2) not null,
  pack_size text not null,
  stock_qty int not null default 100,
  is_active boolean not null default true,
  fssai_status text default 'pending',
  energy_kcal numeric(6,1),
  protein_g numeric(5,1),
  fat_g numeric(5,1),
  carbs_g numeric(5,1),
  nutrition_basis text default 'per 100g',
  nutrition_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- orders ----------
create table if not exists orders (
  id text primary key,                     -- human-readable order code, e.g. DB20260805A1
  user_id uuid references auth.users(id),  -- set when the customer is logged in; null for guest checkout
  customer_name text not null,
  email text,
  phone text not null,
  address text not null,
  subtotal numeric(10,2) not null,
  shipping_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method text not null default 'COD',
  payment_status text not null default 'pending',   -- pending, paid, failed
  razorpay_order_id text,
  razorpay_payment_id text,
  status text not null default 'Placed',   -- Placed, Packed, Shipped, Delivered, Cancelled
  created_at timestamptz not null default now()
);

-- ---------- order_items ----------
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id text references orders(id) on delete cascade,
  product_id text references products(id),
  variant_id text,
  pack_size text,
  product_name text not null,
  product_name_odia text not null,
  qty int not null,
  price numeric(10,2) not null
);

-- ---------- order_status_history (for tracking timeline) ----------
create table if not exists order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id text references orders(id) on delete cascade,
  status text not null,
  changed_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
-- Products: readable by anyone (storefront), writable only via service role (admin).
alter table products enable row level security;
create policy "Public can read active products" on products
  for select using (is_active = true);

alter table categories enable row level security;
create policy "Public can read categories" on categories
  for select using (true);

-- Orders: customers can insert their own order (checkout) as a guest or
-- while logged in. Only a logged-in user can directly query their own
-- orders (guest lookup by phone goes through the rate-limited /api/orders
-- route using the service-role key, not this policy).
alter table orders enable row level security;
create policy "Anyone can place an order" on orders
  for insert with check (true);
create policy "Users can view their own orders" on orders
  for select using (auth.uid() = user_id);

alter table order_items enable row level security;
create policy "Anyone can insert order items with their order" on order_items
  for insert with check (true);
create policy "Users can view their own order items" on order_items
  for select using (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );

alter table order_status_history enable row level security;
create policy "Users can view their own order status history" on order_status_history
  for select using (
    exists (select 1 from orders where orders.id = order_status_history.order_id and orders.user_id = auth.uid())
  );
create policy "Status history can be inserted" on order_status_history
  for insert with check (true);

-- ---------- seed: categories ----------
insert into categories (id, name, sort_order) values
  ('oils', 'Cold-Pressed Oils', 1),
  ('chhatua', 'Chhatua & Sattu', 2),
  ('flours', 'Flours & Besan', 3),
  ('spices', 'Masala & Spices', 4),
  ('dal', 'Dal & Pulses', 5),
  ('papad', 'Papad & Wadi', 6),
  ('other', 'Speciality', 7)
on conflict (id) do nothing;

-- ---------- seed: products (matches the offline price list) ----------
insert into products (id, name, name_odia, category_id, description, price, mrp, pack_size) values
  ('mustard-oil', 'Mustard Oil', 'ଖୋରିଷ ତେଲ', 'oils', 'Kachi ghani cold-pressed mustard oil, pungent and unrefined.', 189, 230, '500 ml'),
  ('coconut-oil', 'Coconut Oil', 'ନଡ଼ିଆ ତେଲ', 'oils', 'Cold-pressed coconut oil, light and aromatic.', 210, 250, '500 ml'),
  ('groundnut-oil', 'Groundnut Oil', 'ବାଦାମ ତେଲ', 'oils', 'Cold-pressed groundnut oil with a mild nutty flavour.', 195, 235, '500 ml'),
  ('sunflower-oil', 'Sunflower Oil', 'ସୂର୍ଯ୍ୟମୁଖୀ ତେଲ', 'oils', 'Light, neutral-tasting sunflower oil.', 175, 210, '500 ml'),
  ('sesame-oil', 'Sesame Oil', 'ଖସା ତେଲ', 'oils', 'Cold-pressed sesame (til) oil, rich and nutty.', 220, 260, '250 ml'),
  ('chickpea-chhatua', 'Chickpea Chhatua', 'ବୁଟ ଛତୁଆ', 'chhatua', 'Roasted chickpea chhatua, a protein-rich breakfast staple.', 139, 160, '500 g'),
  ('ragi-chhatua', 'Ragi Chhatua', 'ମାଣ୍ଡିଆ ଛତୁଆ', 'chhatua', 'Finger millet chhatua, high in calcium and fibre.', 129, 150, '500 g'),
  ('mix-chhatua-sugar', 'Mix Chhatua (Sugar)', 'ମିକ୍ସ ଛତୁଆ (Sugar)', 'chhatua', 'Sweetened multi-grain chhatua blend.', 149, 175, '500 g'),
  ('mix-chhatua-nosugar', 'Mix Chhatua (No Sugar)', 'ମିକ୍ସ ଛତୁଆ (No Sugar)', 'chhatua', 'Multi-grain chhatua blend without added sugar.', 149, 175, '500 g'),
  ('special-chhatua', 'Special Chhatua', 'ସ୍ପେସାଲ ଛତୁଆ', 'chhatua', 'Premium-grade chhatua blend, finer roast and grind.', 179, 210, '500 g'),
  ('multigrain-aata', 'Multi Grain Aata', 'ମଲ୍ଟି ଗ୍ରେନ ଅଟା', 'flours', 'Stone-ground multi-grain flour.', 89, 105, '1 kg'),
  ('besan', 'Besan', 'ବେସନ', 'flours', 'Fine-ground chickpea flour.', 79, 95, '500 g'),
  ('turmeric-powder', 'Turmeric Powder', 'ହଳଦୀ ଗୁଣ୍ଡ', 'spices', 'Stone-ground turmeric powder, no added colour.', 69, 85, '200 g'),
  ('chilli-powder', 'Chilli Powder', 'ଲଙ୍କା ଗୁଣ୍ଡ', 'spices', 'Sun-dried red chilli, ground fresh.', 75, 90, '200 g'),
  ('jeera-powder', 'Jeera Powder', 'ଜିରା ଗୁଣ୍ଡ', 'spices', 'Roasted cumin powder, ground fine.', 85, 100, '200 g'),
  ('triphala-churna', 'Triphala Churna', 'ତ୍ରିଫଳା ଚୂର୍ଣ୍ଣ', 'spices', 'Traditional three-fruit churna blend.', 99, 120, '200 g'),
  ('moong-dal', 'Moong Dal', 'ମୁଗ ଡାଲି', 'dal', 'Split yellow moong dal.', 129, 150, '500 g'),
  ('blackgram-dal', 'Black Gram Dal', 'ବିରି ଡାଲି', 'dal', 'Whole black gram (biri) dal.', 135, 160, '500 g'),
  ('splitchickpea-dal', 'Split Chickpea Dal', 'ଚଣା ଡାଲି', 'dal', 'Split chana dal, a kitchen staple.', 119, 140, '500 g'),
  ('blackgram-wadi', 'Black Gram Wadi', 'ବିରି ବଡ଼ି', 'papad', 'Sun-dried black gram wadi, hand-shaped.', 149, 175, '250 g'),
  ('milet-papad', 'Milet Papad', 'ମାଣ୍ଡିଆ ପାପଡ', 'papad', 'Millet-based papad, thin and crisp.', 99, 120, '200 g'),
  ('mustard-pidia', 'Mustard Pidia', 'ଖୋରିଷ ପିଡ଼ିଆ', 'other', 'Pressed mustard seed cake.', 59, 75, '200 g'),
  ('lemongrass-tea', 'Herbal Lemon Grass Tea', 'ହରବଳ ଲେମନଗ୍ରାସ ଚି', 'other', 'Dried lemongrass, sun-dried herbal infusion.', 119, 140, '100 g')
on conflict (id) do nothing;

-- ---------- nutrition values (typical/reference figures, not lab results) ----------
-- See the note in migration_3_nutrition.sql — replace with real lab-tested
-- values and set nutrition_verified = true before public launch.
update products set energy_kcal = 884, protein_g = 0,    fat_g = 100,  carbs_g = 0    where id = 'mustard-oil';
update products set energy_kcal = 862, protein_g = 0,    fat_g = 99.1, carbs_g = 0    where id = 'coconut-oil';
update products set energy_kcal = 884, protein_g = 0,    fat_g = 100,  carbs_g = 0    where id = 'groundnut-oil';
update products set energy_kcal = 884, protein_g = 0,    fat_g = 100,  carbs_g = 0    where id = 'sunflower-oil';
update products set energy_kcal = 884, protein_g = 0,    fat_g = 100,  carbs_g = 0    where id = 'sesame-oil';
update products set energy_kcal = 387, protein_g = 20.1, fat_g = 5.6,  carbs_g = 60.9 where id = 'chickpea-chhatua';
update products set energy_kcal = 336, protein_g = 7.3,  fat_g = 1.3,  carbs_g = 72.0 where id = 'ragi-chhatua';
update products set energy_kcal = 375, protein_g = 14.0, fat_g = 4.5,  carbs_g = 68.0 where id = 'mix-chhatua-sugar';
update products set energy_kcal = 365, protein_g = 15.5, fat_g = 4.8,  carbs_g = 62.0 where id = 'mix-chhatua-nosugar';
update products set energy_kcal = 390, protein_g = 20.5, fat_g = 5.9,  carbs_g = 59.0 where id = 'special-chhatua';
update products set energy_kcal = 340, protein_g = 12.0, fat_g = 2.0,  carbs_g = 70.0 where id = 'multigrain-aata';
update products set energy_kcal = 387, protein_g = 22.0, fat_g = 6.0,  carbs_g = 58.0 where id = 'besan';
update products set energy_kcal = 312, protein_g = 9.7,  fat_g = 3.3,  carbs_g = 67.1 where id = 'turmeric-powder';
update products set energy_kcal = 282, protein_g = 12.0, fat_g = 14.3, carbs_g = 49.7 where id = 'chilli-powder';
update products set energy_kcal = 375, protein_g = 17.8, fat_g = 22.3, carbs_g = 44.2 where id = 'jeera-powder';
update products set energy_kcal = 250, protein_g = 4.0,  fat_g = 1.0,  carbs_g = 60.0 where id = 'triphala-churna';
update products set energy_kcal = 347, protein_g = 24.0, fat_g = 1.2,  carbs_g = 59.0 where id = 'moong-dal';
update products set energy_kcal = 341, protein_g = 25.2, fat_g = 1.6,  carbs_g = 58.9 where id = 'blackgram-dal';
update products set energy_kcal = 364, protein_g = 19.3, fat_g = 6.0,  carbs_g = 61.0 where id = 'splitchickpea-dal';
update products set energy_kcal = 350, protein_g = 20.0, fat_g = 3.0,  carbs_g = 55.0 where id = 'blackgram-wadi';
update products set energy_kcal = 350, protein_g = 10.0, fat_g = 2.0,  carbs_g = 70.0 where id = 'milet-papad';
update products set energy_kcal = 400, protein_g = 30.0, fat_g = 10.0, carbs_g = 20.0 where id = 'mustard-pidia';
update products set energy_kcal = 66,  protein_g = 1.8,  fat_g = 0.5,  carbs_g = 15.0 where id = 'lemongrass-tea';

-- ---------- Phase 2: reviews, wishlist, subscriptions, bundles ----------
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id text references products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review_text text,
  is_verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
alter table reviews enable row level security;
create policy "Reviews are public to read" on reviews for select using (true);

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

create table if not exists product_certificates (
  id uuid primary key default uuid_generate_v4(),
  product_id text references products(id) on delete cascade,
  title text not null,
  file_url text not null,
  uploaded_at timestamptz not null default now()
);
alter table product_certificates enable row level security;
create policy "Certificates are public to read" on product_certificates for select using (true);

insert into storage.buckets (id, name, public)
values ('product-certificates', 'product-certificates', true)
on conflict (id) do nothing;

create table if not exists wishlist_items (
  user_id uuid references auth.users(id) on delete cascade,
  product_id text references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table wishlist_items enable row level security;
create policy "Users manage their own wishlist" on wishlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id text references products(id) on delete cascade,
  frequency_days int not null default 30,
  discount_pct int not null default 10,
  status text not null default 'active',
  next_order_date date not null default (current_date + 30),
  created_at timestamptz not null default now()
);
alter table subscriptions enable row level security;
create policy "Users manage their own subscriptions" on subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists bundle_items (
  bundle_id text references products(id) on delete cascade,
  product_id text references products(id),
  qty int not null default 1,
  primary key (bundle_id, product_id)
);
alter table bundle_items enable row level security;
create policy "Bundle contents are public to read" on bundle_items for select using (true);

insert into categories (id, name, sort_order) values ('bundles', 'Combo Kits', 0)
on conflict (id) do nothing;

insert into products (id, name, name_odia, category_id, description, price, mrp, pack_size) values
  ('combo-breakfast-kit', 'Odisha Breakfast Kit', 'ଓଡ଼ିଶା ଜଳଖିଆ କିଟ', 'bundles',
   'Everything for a traditional Odia breakfast — mustard oil, chickpea chhatua, and millet papad, bundled at a discount.',
   349, 437, '3-item kit'),
  ('combo-cooking-essentials', 'Cooking Essentials Kit', 'ରୋଷେଇ ଆବଶ୍ୟକୀୟ କିଟ', 'bundles',
   'The core spices every kitchen needs — turmeric, chilli, and jeera powder, bundled at a discount.',
   199, 229, '3-item kit')
on conflict (id) do nothing;

insert into bundle_items (bundle_id, product_id, qty) values
  ('combo-breakfast-kit', 'mustard-oil', 1),
  ('combo-breakfast-kit', 'chickpea-chhatua', 1),
  ('combo-breakfast-kit', 'milet-papad', 1),
  ('combo-cooking-essentials', 'turmeric-powder', 1),
  ('combo-cooking-essentials', 'chilli-powder', 1),
  ('combo-cooking-essentials', 'jeera-powder', 1)
on conflict (bundle_id, product_id) do nothing;

create or replace view product_ratings as
  select product_id, avg(rating)::numeric(2,1) as avg_rating, count(*) as review_count
  from reviews
  group by product_id;

-- ---------- Divya Bharat Club membership (platform-wide, replaces per-product subscribe) ----------
create table if not exists memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  plan text not null,
  status text not null default 'active',
  amount_paid numeric(10,2) not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  start_date date not null default current_date,
  end_date date not null,
  created_at timestamptz not null default now()
);
alter table memberships enable row level security;
create policy "Users view their own memberships" on memberships
  for select using (auth.uid() = user_id);

-- ---------- coupons ----------
create table if not exists coupons (
  code text primary key,
  type text not null,
  value numeric(10,2) not null default 0,
  min_order_value numeric(10,2) not null default 0,
  usage_limit int,
  used_count int not null default 0,
  is_active boolean not null default true,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now()
);
alter table coupons enable row level security;

alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists discount_amount numeric(10,2) not null default 0;

insert into coupons (code, type, value, min_order_value, usage_limit) values
  ('WELCOME10', 'percent', 10, 199, null),
  ('FREESHIP', 'free_shipping', 0, 299, null)
on conflict (code) do nothing;

-- ---------- abandoned cart recovery ----------
create table if not exists cart_snapshots (
  id uuid primary key default uuid_generate_v4(),
  token text unique not null,
  user_id uuid references auth.users(id),
  email text not null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  reminded_at timestamptz,
  converted boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table cart_snapshots enable row level security;

-- ---------- product image storage bucket ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ---------- referral program ----------
create table if not exists referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text unique not null,
  created_at timestamptz not null default now()
);
alter table referral_codes enable row level security;
create policy "Users view their own referral code" on referral_codes
  for select using (auth.uid() = user_id);

create table if not exists referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_user_id uuid references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete cascade unique,
  referred_order_id text references orders(id),
  reward_issued boolean not null default false,
  reward_coupon_code text,
  tier text,
  created_at timestamptz not null default now()
);
alter table referrals enable row level security;
create policy "Users view referrals they made" on referrals
  for select using (auth.uid() = referrer_user_id);

-- ---------- product variants (pack sizes) ----------
create table if not exists product_variants (
  id text primary key,
  product_id text references products(id) on delete cascade,
  pack_size text not null,
  price numeric(10,2) not null,
  mrp numeric(10,2) not null,
  stock_qty int not null default 100,
  is_default boolean not null default false,
  sort_order int not null default 0,
  hsn_code text,
  gst_rate numeric
);
alter table product_variants enable row level security;
create policy "Variants are public to read" on product_variants for select using (true);

insert into product_variants (id, product_id, pack_size, price, mrp, sort_order, is_default)
select id || '-default', id, pack_size, price, mrp, 0, true
from products
on conflict (id) do nothing;

insert into product_variants (id, product_id, pack_size, price, mrp, sort_order, is_default) values
  ('mustard-oil-250ml', 'mustard-oil', '250 ml', 105, 125, 1, false),
  ('mustard-oil-1l', 'mustard-oil', '1 L', 355, 430, 2, false),
  ('coconut-oil-250ml', 'coconut-oil', '250 ml', 115, 140, 1, false),
  ('coconut-oil-1l', 'coconut-oil', '1 L', 395, 470, 2, false),
  ('groundnut-oil-250ml', 'groundnut-oil', '250 ml', 110, 130, 1, false),
  ('groundnut-oil-1l', 'groundnut-oil', '1 L', 365, 440, 2, false),
  ('sunflower-oil-250ml', 'sunflower-oil', '250 ml', 95, 115, 1, false),
  ('sunflower-oil-1l', 'sunflower-oil', '1 L', 325, 395, 2, false),
  ('sesame-oil-500ml', 'sesame-oil', '500 ml', 410, 485, 1, false),
  ('chickpea-chhatua-250g', 'chickpea-chhatua', '250 g', 79, 90, 1, false),
  ('chickpea-chhatua-1kg', 'chickpea-chhatua', '1 kg', 265, 305, 2, false),
  ('ragi-chhatua-250g', 'ragi-chhatua', '250 g', 75, 85, 1, false),
  ('ragi-chhatua-1kg', 'ragi-chhatua', '1 kg', 245, 285, 2, false),
  ('multigrain-aata-500g', 'multigrain-aata', '500 g', 49, 58, 1, false),
  ('multigrain-aata-2kg', 'multigrain-aata', '2 kg', 165, 195, 2, false),
  ('besan-1kg', 'besan', '1 kg', 149, 175, 1, false),
  ('moong-dal-250g', 'moong-dal', '250 g', 69, 80, 1, false),
  ('moong-dal-1kg', 'moong-dal', '1 kg', 235, 270, 2, false),
  ('blackgram-dal-250g', 'blackgram-dal', '250 g', 72, 85, 1, false),
  ('blackgram-dal-1kg', 'blackgram-dal', '1 kg', 245, 285, 2, false),
  ('splitchickpea-dal-250g', 'splitchickpea-dal', '250 g', 65, 75, 1, false),
  ('splitchickpea-dal-1kg', 'splitchickpea-dal', '1 kg', 215, 250, 2, false),
  ('turmeric-powder-100g', 'turmeric-powder', '100 g', 39, 48, 1, false),
  ('chilli-powder-100g', 'chilli-powder', '100 g', 42, 50, 1, false),
  ('jeera-powder-100g', 'jeera-powder', '100 g', 47, 55, 1, false)
on conflict (id) do nothing;

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
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'staff',
  added_at timestamptz not null default now()
);
alter table admin_users enable row level security;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ---------- multi-image product galleries ----------
create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id text references products(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table product_images enable row level security;
create policy "Product images are public to read" on product_images for select using (true);

-- ---------- loyalty points ----------
create table if not exists loyalty_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  order_id text references orders(id),
  points int not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table loyalty_transactions enable row level security;
create policy "Users view their own loyalty transactions" on loyalty_transactions
  for select using (auth.uid() = user_id);

create or replace view loyalty_balances
  with (security_invoker = true) as
  select user_id, sum(points) as balance
  from loyalty_transactions
  group by user_id;

-- ---------- daily offers ----------
-- Admin-curated "today's offers" + one featured Deal of the Day. No
-- scheduling/expiry by design — see migration_16_daily_offers.sql.
create table if not exists daily_offers (
  id uuid primary key default uuid_generate_v4(),
  product_id text not null references products(id) on delete cascade,
  variant_id text not null references product_variants(id) on delete cascade,
  offer_price numeric not null,
  is_deal_of_the_day boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table daily_offers enable row level security;
create policy "Active daily offers are public to read" on daily_offers
  for select using (active = true);

create unique index if not exists daily_offers_single_deal
  on daily_offers (is_deal_of_the_day)
  where is_deal_of_the_day = true and active = true;

-- ---------- return/refund requests ----------
-- No public RLS policies — see migration_17_returns.sql for why.
create table if not exists return_requests (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  comments text,
  photo_urls text[] not null default '{}',
  status text not null default 'Requested', -- Requested, Approved, Rejected, Refunded
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table return_requests enable row level security;

insert into storage.buckets (id, name, public)
values ('return-photos', 'return-photos', true)
on conflict (id) do nothing;

-- ---------- blog posts ----------
-- Long-form content (recipes, nutrition guides, process pieces) for
-- organic SEO — see migration_19_blog.sql.
create table if not exists blog_posts (
  id text primary key,
  title text not null,
  excerpt text,
  content text not null,
  cover_image_url text,
  category text,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table blog_posts enable row level security;
create policy "Published posts are public to read" on blog_posts
  for select using (published = true);

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- ---------- use-case / collection landing pages ----------
-- Shared shape for /use-case/[slug] and /collections/[slug] — see
-- migration_23_landing_pages.sql.
create table if not exists landing_pages (
  id text primary key,
  type text not null check (type in ('use-case', 'collection')),
  title text not null,
  subtitle text,
  content text,
  product_ids text[] not null default '{}',
  cover_image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table landing_pages enable row level security;
create policy "Published landing pages are public to read" on landing_pages
  for select using (published = true);

insert into storage.buckets (id, name, public)
values ('landing-images', 'landing-images', true)
on conflict (id) do nothing;

-- ---------- newsletter signups ----------
-- See migration_24_newsletter.sql.
create table if not exists newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table newsletter_subscribers enable row level security;

