import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromRequest } from "@/lib/getUserFromRequest";
import { isNonEmptyString, sanitizeText } from "@/lib/validate";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!isNonEmptyString(productId, 100)) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("product_questions")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`questions-post:${getClientKey(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Please sign in to ask a question." }, { status: 401 });
  }

  const { productId, question } = await req.json();
  if (!isNonEmptyString(productId, 100)) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }
  if (!isNonEmptyString(question, 500)) {
    return NextResponse.json({ error: "Please enter a question (500 characters max)." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("product_questions").insert({
    product_id: productId,
    user_id: userId,
    question: sanitizeText(question)
  });
  if (error) {
    console.error("Failed to save question", error);
    return NextResponse.json({ error: "Could not save your question. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
