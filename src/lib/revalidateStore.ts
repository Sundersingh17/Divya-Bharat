import { revalidatePath } from "next/cache";

// Stock, price or product changed: drop the cached storefront pages so
// customers see the new figures immediately instead of after the cache expires.
export function revalidateStorefront() {
  try {
    revalidatePath("/", "layout");
  } catch (err) {
    console.error("revalidateStorefront failed", err);
  }
}
