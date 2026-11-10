import crypto from "crypto";
import { rateLimit, getClientKey } from "./rateLimit";
import { getUserIdFromRequest } from "./getUserFromRequest";
import { supabaseAdmin } from "./supabaseAdmin";

export type AdminAuthResult = { ok: boolean; role?: "owner" | "staff"; userId?: string };

/**
 * Two ways in:
 * 1. The shared ADMIN_PASSWORD header (x-admin-password) — always grants
 *    "owner". This is the bootstrap method so the founder is never locked
 *    out even before any staff accounts exist.
 * 2. A signed-in customer account (Bearer token) that's been added to the
 *    admin_users table — grants whatever role they were given there. This
 *    is how staff log in with their own phone/email OTP account instead
 *    of everyone sharing one password.
 */
export async function checkAdminAuth(req: Request): Promise<AdminAuthResult> {
  const allowed = rateLimit(`admin-auth:${getClientKey(req)}`, 15, 60_000);
  if (!allowed) return { ok: false };

  const provided = req.headers.get("x-admin-password");
  const expected = process.env.ADMIN_PASSWORD ?? "";
  // Set ADMIN_PASSWORD_DISABLED=true once staff accounts exist, to turn the shared password off.
  const passwordDisabled = process.env.ADMIN_PASSWORD_DISABLED === "true";
  if (provided && expected && !passwordDisabled) {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { ok: true, role: "owner" };
    }
  }

  const userId = await getUserIdFromRequest(req);
  if (userId) {
    const { data } = await supabaseAdmin
      .from("admin_users")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      return { ok: true, role: data.role as "owner" | "staff", userId };
    }
  }

  return { ok: false };
}
