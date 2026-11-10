import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Server-only client. Bypasses row-level security, so it must never be
// imported into a client component or exposed to the browser. Used by
// API routes and the admin area for order/product management.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false }
});
