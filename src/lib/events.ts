import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type EventType =
  | "payment_mismatch"
  | "order_failed"
  | "email_failed"
  | "stock_race"
  | "low_stock";

/** Best-effort operational log shown on Admin → Health. Never throws. */
export async function logEvent(type: EventType, detail: Record<string, unknown> = {}) {
  try {
    await supabaseAdmin.from("system_events").insert({ type, detail });
  } catch (err) {
    console.error("logEvent failed", type, err);
  }
}
