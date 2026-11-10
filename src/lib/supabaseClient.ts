import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Used in client components and in server code that should respect
// row-level security (e.g. reading the public product catalog).
export const supabase = createClient(url, anonKey);
