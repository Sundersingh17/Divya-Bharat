import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { isNonEmptyString, isValidPhone } from "@/lib/validate";
import { generateInvoicePdf } from "@/lib/invoice";

export async function GET(req: NextRequest) {
  if (!rateLimit(`invoice:${getClientKey(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const orderId = req.nextUrl.searchParams.get("orderId");
  const phone = req.nextUrl.searchParams.get("phone");
  if (!isNonEmptyString(orderId, 50)) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  try {
    const { data: order, error } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (error || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Same ownership check as returns/orders lookup: a logged-in session
    // must own the order, otherwise the phone must match.
    const userId = await getUserIdFromRequest(req);
    const ownsViaSession = userId && order.user_id === userId;
    const ownsViaPhone = isValidPhone(phone) && order.phone === phone!.trim();
    if (!ownsViaSession && !ownsViaPhone) {
      return NextResponse.json({ error: "We couldn't verify this order." }, { status: 403 });
    }

    const { data: orderItems } = await supabaseAdmin
      .from("order_items")
      .select("product_name, pack_size, qty, price, variant_id")
      .eq("order_id", orderId);

    const variantIds = Array.from(
      new Set((orderItems ?? []).map((it) => it.variant_id).filter(Boolean))
    ) as string[];
    const { data: variants } = variantIds.length
      ? await supabaseAdmin.from("product_variants").select("id, hsn_code, gst_rate").in("id", variantIds)
      : { data: [] as any[] };
    const variantById = new Map((variants ?? []).map((v: any) => [v.id, v]));

    const items = (orderItems ?? []).map((it) => ({
      product_name: it.product_name,
      pack_size: it.pack_size,
      qty: Number(it.qty),
      price: Number(it.price),
      hsn_code: it.variant_id ? variantById.get(it.variant_id)?.hsn_code ?? null : null,
      gst_rate: it.variant_id ? variantById.get(it.variant_id)?.gst_rate ?? null : null
    }));

    // orders.subtotal/shipping_fee/total are Postgres `numeric` columns,
    // which supabase-js can hand back as strings rather than numbers —
    // coerce before handing them to the PDF generator's arithmetic.
    const normalizedOrder = {
      ...order,
      subtotal: Number(order.subtotal),
      shipping_fee: Number(order.shipping_fee),
      total: Number(order.total)
    };

    const pdfBuffer = await generateInvoicePdf(normalizedOrder, items);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${order.id}.pdf"`
      }
    });
  } catch (err: any) {
    console.error("Invoice generation failed", err);
    return NextResponse.json(
      { error: "Could not generate the invoice.", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
