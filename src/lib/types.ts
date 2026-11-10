export type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  pack_size: string;
  price: number;
  mrp: number;
  stock_qty: number;
  is_default: boolean;
  sort_order: number;
  // Merged in from an active daily_offers row for this variant, if any —
  // see lib/catalog.ts. Not columns on product_variants itself.
  offer_price?: number | null;
  is_deal_of_the_day?: boolean;
  // GST invoice fields — filled in per pack size in /admin/products.
  // Optional and blank by default; see migration_18_gst_invoice.sql.
  hsn_code?: string | null;
  gst_rate?: number | null;
};

export type DailyOffer = {
  id: string;
  product_id: string;
  variant_id: string;
  offer_price: number;
  is_deal_of_the_day: boolean;
  active: boolean;
  created_at: string;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  storage_path: string;
  sort_order: number;
  // Optional variant mapping (migration_25). null/undefined = shared image
  // shown for every pack size. view = 'front' | 'back' | 'other'.
  variant_id?: string | null;
  view?: string | null;
};

export type Product = {
  id: string;
  name: string;
  name_odia: string;
  category_id: string;
  description: string | null;
  price: number;
  mrp: number;
  pack_size: string;
  stock_qty: number;
  is_active: boolean;
  fssai_status: string | null;
  energy_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  nutrition_basis: string | null;
  nutrition_verified: boolean;
  avg_rating?: number | null;
  review_count?: number;
  variants?: ProductVariant[];
  images?: ProductImageRow[];
};

export type CartItem = {
  productId: string;
  variantId: string;
  packSize: string;
  name: string;
  nameOdia: string;
  price: number;
  qty: number;
  categoryId?: string;
};

export type OrderStatus = "Placed" | "Packed" | "Shipped" | "Delivered" | "Cancelled";

export type Order = {
  id: string;
  customer_name: string;
  email?: string | null;
  phone: string;
  address: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: string;
  status: OrderStatus;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_name_odia: string;
  qty: number;
  price: number;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  is_verified_purchase: boolean;
  created_at: string;
};

export type ProductQuestion = {
  id: string;
  product_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
};

export type WishlistItem = {
  user_id: string;
  product_id: string;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  product_id: string;
  frequency_days: number;
  discount_pct: number;
  status: "active" | "paused" | "cancelled";
  next_order_date: string;
  created_at: string;
};

export type Membership = {
  id: string;
  user_id: string;
  plan: "monthly" | "yearly";
  status: "active" | "expired" | "cancelled";
  amount_paid: number;
  start_date: string;
  end_date: string;
  created_at: string;
};
