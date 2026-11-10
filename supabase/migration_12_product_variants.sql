-- Product variants — lets a single product (e.g. "Mustard Oil") offer
-- multiple pack sizes (250ml / 500ml / 1L) each with its own price, like
-- Zepto/Blinkit. Run once in Supabase's SQL editor.
-- (New installs: schema.sql already includes this, skip this file.)

create table if not exists product_variants (
  id text primary key,                    -- e.g. 'mustard-oil-250ml'
  product_id text references products(id) on delete cascade,
  pack_size text not null,                -- '250 ml', '500 g', '1 kg', etc
  price numeric(10,2) not null,
  mrp numeric(10,2) not null,
  stock_qty int not null default 100,
  is_default boolean not null default false,
  sort_order int not null default 0
);
alter table product_variants enable row level security;
create policy "Variants are public to read" on product_variants for select using (true);

-- Every product gets at least its existing pack_size/price as one variant,
-- so nothing breaks for products that only ever had one size.
insert into product_variants (id, product_id, pack_size, price, mrp, sort_order, is_default)
select id || '-default', id, pack_size, price, mrp, 0, true
from products
on conflict (id) do nothing;

-- Extra size options for the categories where it makes obvious sense
-- (oils, chhatua, flours, dal, spices). Prices are scaled roughly off the
-- existing single-size price — treat these as a starting point and
-- adjust in /admin once real per-size costs are confirmed.
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

-- Track which pack size was actually ordered (order_items previously had
-- no way to distinguish a 250ml order from a 1L order of the same product).
alter table order_items add column if not exists variant_id text;
alter table order_items add column if not exists pack_size text;
