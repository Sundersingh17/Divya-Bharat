// Sends order-status WhatsApp messages via Meta's WhatsApp Cloud API.
//
// This talks directly to graph.facebook.com — no third-party reseller
// needed — but it does need a WhatsApp Business account set up in Meta
// Business Manager first. Until the env vars below are set, every call
// here just logs and returns, so the rest of the site works exactly as
// before with zero configuration.
//
// Required setup (one-time, in Meta Business Manager / developers.facebook.com):
//   1. Create a WhatsApp Business app and a phone number for it.
//   2. Create a message TEMPLATE (Business Manager → WhatsApp Manager →
//      Message Templates) — required because this is a business-initiated
//      message, not a reply, so free-form text isn't allowed outside a
//      24-hour customer conversation window. A simple one works:
//        Name: order_status_update
//        Category: Utility
//        Body: "Hi {{1}}, your Divya Bharat order {{2}} is now: {{3}}."
//      Wait for Meta to approve it (usually minutes to a few hours).
//   3. Set these in .env:
//        WHATSAPP_PHONE_NUMBER_ID=<from the app's API setup page>
//        WHATSAPP_ACCESS_TOKEN=<a permanent access token for the app>
//        WHATSAPP_TEMPLATE_NAME=order_status_update  (or whatever you named it)
//
// SMS (Twilio, MSG91, etc.) would follow the same shape — a plain fetch
// call to that provider's send-message endpoint — if you'd rather start
// there instead of WhatsApp.

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "order_status_update";

export async function sendOrderStatusWhatsApp(params: {
  toPhone: string; // 10-digit Indian mobile number, as stored on the order
  customerName: string;
  orderId: string;
  status: string;
}) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.warn("WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not set — skipping WhatsApp status update.");
    return;
  }
  // WhatsApp Cloud API wants a full international number with no leading
  // zero or "+" — India's country code is 91.
  const toNumber = "91" + params.toPhone.replace(/\D/g, "").slice(-10);

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "template",
        template: {
          name: TEMPLATE_NAME,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: params.customerName },
                { type: "text", text: params.orderId },
                { type: "text", text: params.status }
              ]
            }
          ]
        }
      })
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("WhatsApp status message failed", res.status, body);
    }
  } catch (err) {
    // Notification failures should never break an admin's order update.
    console.error("Failed to send WhatsApp status update", err);
  }
}
