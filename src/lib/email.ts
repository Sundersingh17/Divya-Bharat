import { Resend } from "resend";

import { logEvent } from "@/lib/events";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend's shared "onboarding@resend.dev" sender works with zero setup for
// testing (goes to real inboxes, but looks like it's from Resend). Once you
// verify your own domain in Resend, switch this to something like
// "orders@divyabharatfoods.com" for a properly branded sender.
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "Divya Bharat <onboarding@resend.dev>";

type OrderItemLine = { product_name: string; qty: number; price: number };

function itemsListHtml(items: OrderItemLine[]) {
  return items
    .map(
      (it) =>
        `<tr><td style="padding:6px 0;">${it.product_name} × ${it.qty}</td><td style="padding:6px 0;text-align:right;">₹${it.price * it.qty}</td></tr>`
    )
    .join("");
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  orderId: string;
  customerName: string;
  items: OrderItemLine[];
  total: number;
  paymentMethod: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping order confirmation email.");
    return;
  }
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `Order confirmed — ${params.orderId}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#B85C38;">Thanks for your order, ${params.customerName}!</h2>
          <p>Your order <b>${params.orderId}</b> has been placed${
        params.paymentMethod === "COD" ? " — pay in cash on delivery." : " and payment received."
      }</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            ${itemsListHtml(params.items)}
            <tr style="border-top:1px solid #ddd;font-weight:bold;">
              <td style="padding:8px 0;">Total</td>
              <td style="padding:8px 0;text-align:right;">₹${params.total}</td>
            </tr>
          </table>
          <p style="color:#666;font-size:13px;">We'll email you again once your order ships. You can also track it anytime using the phone number you checked out with.</p>
        </div>
      `
    });
  } catch (err) {
    // Email failures should never break order placement — log and move on.
    console.error("Failed to send order confirmation email", err);
    logEvent("email_failed", { what: "Failed to send order confirmation email" });
  }
}

export async function sendOrderStatusEmail(params: {
  to: string;
  orderId: string;
  customerName: string;
  status: string;
  // Only used for "Delivered": links where the customer can leave a genuine review.
  reviewLinks?: { name: string; url: string }[];
  // Included for "Shipped" when the admin has entered courier details.
  tracking?: { courier?: string | null; number?: string | null; url?: string | null };
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping status update email.");
    return;
  }
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `Order ${params.orderId} — ${params.status}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#B85C38;">Your order is now: ${params.status}</h2>
          <p>Hi ${params.customerName}, your order <b>${params.orderId}</b> has been updated to <b>${params.status}</b>.</p>
          ${
            params.status === "Shipped" && params.tracking && (params.tracking.number || params.tracking.url)
              ? `<p>${params.tracking.courier ? `Courier: <b>${params.tracking.courier}</b><br/>` : ""}${
                  params.tracking.number ? `Tracking number: <b>${params.tracking.number}</b><br/>` : ""
                }${params.tracking.url ? `<a href="${params.tracking.url}">Track your parcel</a>` : ""}</p>`
              : ""
          }
          ${
            params.status === "Delivered" && params.reviewLinks && params.reviewLinks.length > 0
              ? `<p>Enjoying your order? Tell others what you think (optional):</p><ul>${params.reviewLinks
                  .map((l) => `<li><a href="${l.url}">${l.name}</a></li>`)
                  .join("")}</ul>`
              : ""
          }
        </div>
      `
    });
  } catch (err) {
    console.error("Failed to send order status email", err);
    logEvent("email_failed", { what: "Failed to send order status email" });
  }
}

export async function sendAdminReturnRequestEmail(params: {
  orderId: string;
  customerName: string;
  reason: string;
  comments?: string;
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail || !resend) {
    console.warn("ADMIN_NOTIFICATION_EMAIL or RESEND_API_KEY not set — skipping return-request alert.");
    return;
  }
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `Return requested — ${params.orderId}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#B85C38;">A return has been requested</h2>
          <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">
            <tr><td style="padding:4px 0;color:#666;">Order ID</td><td style="padding:4px 0;font-weight:bold;">${params.orderId}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Customer</td><td style="padding:4px 0;">${params.customerName}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Reason</td><td style="padding:4px 0;">${params.reason}</td></tr>
            ${params.comments ? `<tr><td style="padding:4px 0;color:#666;">Comments</td><td style="padding:4px 0;">${params.comments}</td></tr>` : ""}
          </table>
          <p style="color:#666;font-size:13px;">Open your admin panel → Returns to review it.</p>
        </div>
      `
    });
  } catch (err) {
    console.error("Failed to send return-request alert", err);
    logEvent("email_failed", { what: "Failed to send return-request alert" });
  }
}

export async function sendReturnStatusEmail(params: {
  to: string;
  orderId: string;
  customerName: string;
  status: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping return status email.");
    return;
  }
  const statusMessage: Record<string, string> = {
    Approved: "has been approved. We'll be in touch about pickup/refund next steps.",
    Rejected: "was not approved. Please reach out if you have questions.",
    Refunded: "has been refunded. It may take a few days to reflect depending on your bank."
  };
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `Your return for order ${params.orderId} — ${params.status}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#B85C38;">Return update: ${params.status}</h2>
          <p>Hi ${params.customerName}, your return request for order <b>${params.orderId}</b> ${
        statusMessage[params.status] || `is now: ${params.status}.`
      }</p>
        </div>
      `
    });
  } catch (err) {
    console.error("Failed to send return status email", err);
    logEvent("email_failed", { what: "Failed to send return status email" });
  }
}

export async function sendAdminNewOrderEmail(params: {
  orderId: string;
  customerName: string;
  phone: string;
  email?: string | null;
  address: string;
  items: OrderItemLine[];
  total: number;
  paymentMethod: string;
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.warn("ADMIN_NOTIFICATION_EMAIL not set — skipping new-order alert to admin.");
    return;
  }
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping new-order alert to admin.");
    return;
  }
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `New order — ${params.orderId} (₹${params.total})`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#B85C38;">New order received</h2>
          <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">
            <tr><td style="padding:4px 0;color:#666;">Order ID</td><td style="padding:4px 0;font-weight:bold;">${params.orderId}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Customer</td><td style="padding:4px 0;">${params.customerName}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Phone</td><td style="padding:4px 0;">${params.phone}</td></tr>
            ${params.email ? `<tr><td style="padding:4px 0;color:#666;">Email</td><td style="padding:4px 0;">${params.email}</td></tr>` : ""}
            <tr><td style="padding:4px 0;color:#666;">Address</td><td style="padding:4px 0;">${params.address}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Payment</td><td style="padding:4px 0;">${params.paymentMethod}</td></tr>
          </table>
          <table style="width:100%;border-collapse:collapse;margin:12px 0;">
            ${itemsListHtml(params.items)}
            <tr style="border-top:1px solid #ddd;font-weight:bold;">
              <td style="padding:8px 0;">Total</td>
              <td style="padding:8px 0;text-align:right;">₹${params.total}</td>
            </tr>
          </table>
          <p style="color:#666;font-size:13px;">Open your admin panel to update this order's status.</p>
        </div>
      `
    });
  } catch (err) {
    console.error("Failed to send admin new-order alert", err);
    logEvent("email_failed", { what: "Failed to send admin new-order alert" });
  }
}

export async function sendRestockEmail(params: { to: string; productName: string; packSize: string; productId: string }) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping restock email.");
    return false;
  }
  try {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `${params.productName} (${params.packSize}) is back in stock`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#B85C38;">Back in stock</h2>
          <p><b>${params.productName}</b> (${params.packSize}) is available again.</p>
          ${base ? `<p><a href="${base}/product/${params.productId}">View the product</a></p>` : ""}
        </div>
      `
    });
    return true;
  } catch (err) {
    console.error("Failed to send restock email", err);
    logEvent("email_failed", { what: "Failed to send restock email" });
    return false;
  }
}

export async function sendLowStockAlertEmail(items: { product: string; pack: string; stock: number }[]) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!resend || !to || items.length === 0) return;
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Low stock: ${items.length} item${items.length === 1 ? "" : "s"}`,
      html: `<div style="font-family:sans-serif"><h3>Low stock</h3><ul>${items
        .map((i) => `<li>${i.product} (${i.pack}) — ${i.stock} left</li>`)
        .join("")}</ul></div>`
    });
  } catch (err) {
    console.error("Failed to send low stock email", err);
  }
}

export async function sendAdminAlertEmail(subject: string, html: string) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!resend || !to) return;
  try {
    await resend.emails.send({ from: FROM_ADDRESS, to, subject, html: `<div style="font-family:sans-serif">${html}</div>` });
  } catch (err) {
    console.error("Failed to send admin alert email", err);
    logEvent("email_failed", { what: "Failed to send admin alert email" });
  }
}
