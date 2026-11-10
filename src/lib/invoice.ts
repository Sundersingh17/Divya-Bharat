import PDFDocument from "pdfkit";

// Builds a tax invoice PDF for one order. Deliberately conservative on
// tax specifics: GST rates vary by product (edible oils, flours, pulses
// often sit at different slabs, some 0%), so this only prints a GST
// breakup for line items that actually have a gst_rate set on their
// variant (via /admin/products) — everything else shows "—" rather than
// guessing a rate. Prices are treated as GST-inclusive (the normal way
// retail prices are shown to consumers in India), so the taxable value
// and GST amount are backed out of the price rather than added on top:
//   taxable value = price / (1 + rate/100)
//   GST amount    = price - taxable value
// This is a template, not tax advice — confirm the HSN codes, GST rates,
// and invoice numbering scheme with your CA/accountant before relying on
// these for filing.

type InvoiceItem = {
  product_name: string;
  pack_size?: string | null;
  qty: number;
  price: number; // per-unit, GST-inclusive
  hsn_code?: string | null;
  gst_rate?: number | null;
};

type InvoiceOrder = {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  email?: string | null;
  address: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: string;
};

const BUSINESS_NAME = process.env.BUSINESS_NAME || "Divya Bharat Food Processing Centre";
const BUSINESS_ADDRESS = process.env.BUSINESS_ADDRESS || "Address not yet configured — set BUSINESS_ADDRESS in .env";
const BUSINESS_GSTIN = process.env.BUSINESS_GSTIN || "";

function splitGst(price: number, qty: number, gstRate?: number | null) {
  const lineTotal = price * qty;
  if (gstRate === null || gstRate === undefined) {
    return { taxable: null, gstAmount: null, lineTotal };
  }
  const taxable = lineTotal / (1 + gstRate / 100);
  const gstAmount = lineTotal - taxable;
  return { taxable, gstAmount, lineTotal };
}

export function generateInvoicePdf(order: InvoiceOrder, items: InvoiceItem[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).font("Helvetica-Bold").text(BUSINESS_NAME);
    doc.fontSize(9).font("Helvetica").fillColor("#555").text(BUSINESS_ADDRESS);
    if (BUSINESS_GSTIN) doc.text(`GSTIN: ${BUSINESS_GSTIN}`);
    doc.moveDown(0.8);

    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("TAX INVOICE", { align: "right" });
    doc.fontSize(9).font("Helvetica").fillColor("#555");
    doc.text(`Invoice / Order No: ${order.id}`, { align: "right" });
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, { align: "right" });
    doc.moveDown(1);

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#000").text("Bill To");
    doc.fontSize(9).font("Helvetica").fillColor("#333");
    doc.text(order.customer_name);
    doc.text(order.address);
    doc.text(`Phone: ${order.phone}`);
    if (order.email) doc.text(`Email: ${order.email}`);
    doc.moveDown(1);

    const hasAnyGst = items.some((it) => it.gst_rate !== null && it.gst_rate !== undefined);

    // Table header
    const colX = { item: 40, hsn: 220, qty: 275, rate: 310, taxable: 365, gst: 425, total: 490 };
    const top = doc.y;
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#000");
    doc.text("Item", colX.item, top);
    doc.text("HSN", colX.hsn, top);
    doc.text("Qty", colX.qty, top);
    doc.text("Rate", colX.rate, top);
    doc.text("Taxable", colX.taxable, top);
    if (hasAnyGst) doc.text("GST", colX.gst, top);
    doc.text("Total", colX.total, top);
    doc.moveTo(40, top + 12).lineTo(555, top + 12).strokeColor("#ccc").stroke();
    doc.moveDown(1);

    doc.font("Helvetica").fillColor("#333");
    let taxableSum = 0;
    let gstSum = 0;

    items.forEach((it) => {
      const { taxable, gstAmount, lineTotal } = splitGst(it.price, it.qty, it.gst_rate);
      if (taxable !== null) taxableSum += taxable;
      if (gstAmount !== null) gstSum += gstAmount;

      const y = doc.y;
      const label = it.pack_size ? `${it.product_name} (${it.pack_size})` : it.product_name;
      doc.fontSize(8).text(label, colX.item, y, { width: 175 });
      doc.text(it.hsn_code || "—", colX.hsn, y);
      doc.text(String(it.qty), colX.qty, y);
      doc.text(`₹${it.price}`, colX.rate, y);
      doc.text(taxable !== null ? `₹${taxable.toFixed(2)}` : "—", colX.taxable, y);
      if (hasAnyGst) {
        doc.text(
          gstAmount !== null ? `${it.gst_rate}% (₹${gstAmount.toFixed(2)})` : "—",
          colX.gst,
          y,
          { width: 60 }
        );
      }
      doc.text(`₹${lineTotal.toFixed(2)}`, colX.total, y);
      doc.moveDown(1);
    });

    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.8);

    doc.fontSize(9).font("Helvetica");
    const totalsX = 400;
    doc.text(`Subtotal: ₹${order.subtotal}`, totalsX, doc.y, { align: "right" });
    if (order.shipping_fee > 0) doc.text(`Shipping: ₹${order.shipping_fee}`, totalsX, doc.y, { align: "right" });
    if (hasAnyGst) {
      doc.text(`Total taxable value: ₹${taxableSum.toFixed(2)}`, totalsX, doc.y, { align: "right" });
      doc.text(`Total GST: ₹${gstSum.toFixed(2)}`, totalsX, doc.y, { align: "right" });
    }
    doc.font("Helvetica-Bold").text(`Grand Total: ₹${order.total}`, totalsX, doc.y, { align: "right" });
    doc.moveDown(1);

    doc.fontSize(8).font("Helvetica").fillColor("#888");
    doc.text(`Payment method: ${order.payment_method}`, 40);
    if (!hasAnyGst) {
      doc.moveDown(0.5);
      doc.text(
        "GST rate/HSN details have not been added for the items in this order yet, so this invoice does not include a tax breakup. Add HSN codes and GST rates per pack size in /admin/products to enable it."
      );
    }
    doc.moveDown(0.5);
    doc.text("This is a computer-generated invoice.");

    doc.end();
  });
}
