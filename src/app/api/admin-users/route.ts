import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAdminAuth } from "@/lib/adminAuth";
import { isNonEmptyString } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("user_id, role, added_at")
    .order("added_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach phone/email for display — admin_users only stores the ID.
  const enriched = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
      return {
        ...row,
        phone: userData.user?.phone ?? null,
        email: userData.user?.email ?? null
      };
    })
  );

  return NextResponse.json({ staff: enriched });
}

export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can add staff." }, { status: 403 });
  }

  const { identifier, role } = await req.json();
  if (!isNonEmptyString(identifier, 200)) {
    return NextResponse.json({ error: "Enter the staff member's phone or email." }, { status: 400 });
  }
  if (!["owner", "staff"].includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  // Find an existing customer account matching this phone or email — the
  // person must have signed in at least once already via the normal OTP
  // flow before they can be made staff.
  const isEmail = identifier.includes("@");
  const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    return NextResponse.json({ error: "Could not search accounts." }, { status: 500 });
  }
  const match = usersPage.users.find((u) =>
    isEmail ? u.email?.toLowerCase() === identifier.toLowerCase() : u.phone === identifier.replace(/\D/g, "")
  );

  if (!match) {
    return NextResponse.json(
      { error: "No account found with that phone/email. They need to sign in at least once first." },
      { status: 404 }
    );
  }

  const { error } = await supabaseAdmin
    .from("admin_users")
    .upsert({ user_id: match.id, role }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can remove staff." }, { status: 403 });
  }
  const userId = req.nextUrl.searchParams.get("userId");
  if (!isNonEmptyString(userId, 100)) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("admin_users").delete().eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
