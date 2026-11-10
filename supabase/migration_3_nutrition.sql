-- Run this in Supabase's SQL editor if your products table already exists —
-- adds nutrition columns without touching existing data.
-- (New installs: schema.sql already includes these columns, skip this file.)

alter table products add column if not exists energy_kcal numeric(6,1);
alter table products add column if not exists protein_g numeric(5,1);
alter table products add column if not exists fat_g numeric(5,1);
alter table products add column if not exists carbs_g numeric(5,1);
alter table products add column if not exists nutrition_basis text default 'per 100g';
alter table products add column if not exists nutrition_verified boolean not null default false;

-- ---------- typical nutrition values (see note below) ----------
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

-- IMPORTANT: these are typical/reference values for each food category
-- (standard nutrition-database figures), NOT lab results for Divya
-- Bharat's specific batches. nutrition_verified is false for all of them
-- on purpose. Before public launch, get your products lab-tested and
-- either update these numbers with the real results or set
-- nutrition_verified = true once you've confirmed them — the site shows
-- a "typical values" disclaimer on any product where this is false,
-- which is important for FSSAI/Legal Metrology labeling compliance.
