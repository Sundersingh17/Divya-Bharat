import { redirect } from "next/navigation";

// Old links keep working: shipping/cancellation/refund policy now lives in the Help hub.
export default function PoliciesPage() {
  redirect("/help#shipping");
}
