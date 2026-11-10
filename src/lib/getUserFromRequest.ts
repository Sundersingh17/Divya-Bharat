import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Returns the authenticated user's ID if the request carries a valid
// Supabase session token, or null for guest checkout. Never throws —
// an invalid/missing token just means "treat as guest".
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length);
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
