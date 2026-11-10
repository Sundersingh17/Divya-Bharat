import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }
  return NextResponse.json({ isAdmin: true, role: auth.role });
}
