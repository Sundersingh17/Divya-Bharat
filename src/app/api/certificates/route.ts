import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isNonEmptyString } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!isNonEmptyString(productId, 100)) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("product_certificates")
    .select("id, title, file_url, uploaded_at")
    .eq("product_id", productId)
    .order("uploaded_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ certificates: data });
}
