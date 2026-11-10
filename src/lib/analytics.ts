// Thin wrapper around gtag.js and the Meta Pixel. Every function is a
// safe no-op if the corresponding script hasn't loaded (e.g. IDs not
// configured, or the person has an ad blocker) — analytics should never
// be able to break the actual shopping flow.

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

type CartAnalyticsItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
};

export function trackViewItem(item: CartAnalyticsItem) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "view_item", {
    currency: "INR",
    value: item.price,
    items: [item]
  });
  window.fbq?.("track", "ViewContent", {
    content_ids: [item.item_id],
    content_name: item.item_name,
    value: item.price,
    currency: "INR"
  });
}

export function trackAddToCart(item: CartAnalyticsItem) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "add_to_cart", {
    currency: "INR",
    value: item.price * item.quantity,
    items: [item]
  });
  window.fbq?.("track", "AddToCart", {
    content_ids: [item.item_id],
    content_name: item.item_name,
    value: item.price * item.quantity,
    currency: "INR"
  });
}

export function trackBeginCheckout(items: CartAnalyticsItem[], value: number) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "begin_checkout", { currency: "INR", value, items });
  window.fbq?.("track", "InitiateCheckout", {
    content_ids: items.map((i) => i.item_id),
    value,
    currency: "INR"
  });
}

export function trackPurchase(params: {
  orderId: string;
  value: number;
  items: CartAnalyticsItem[];
}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "purchase", {
    transaction_id: params.orderId,
    currency: "INR",
    value: params.value,
    items: params.items
  });
  window.fbq?.("track", "Purchase", {
    content_ids: params.items.map((i) => i.item_id),
    value: params.value,
    currency: "INR"
  });
}
