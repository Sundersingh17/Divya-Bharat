-- Adds the two pieces of GST info a compliant tax invoice line item
-- needs: the HSN code and the applicable GST rate. Both are nullable
-- and left blank by default — GST rates vary by product (edible oils,
-- flours, and pulses often sit at different slabs, some 0%), so rather
-- than guess, the invoice generator only prints a tax breakup for lines
-- where you've actually filled these in, and shows "GST details not
-- yet added" otherwise. Fill these in per pack size from /admin/products
-- (or ask your accountant/CA which HSN codes and rates apply first).
-- Run once in Supabase's SQL editor. (New installs: schema.sql already
-- includes this, skip this file.)

alter table product_variants add column if not exists hsn_code text;
alter table product_variants add column if not exists gst_rate numeric;
