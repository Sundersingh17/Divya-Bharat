"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type StaffMember = {
  user_id: string;
  role: string;
  added_at: string;
  phone: string | null;
  email: string | null;
};

export default function AdminStaffPage() {
  const { ready, authed, role, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin-users", { headers: authHeaders });
    if (res.ok) {
      setStaff((await res.json()).staff ?? []);
    }
    setLoading(false);
  }

  async function addStaff() {
    setAddError("");
    if (!identifier.trim()) {
      setAddError("Enter a phone number or email.");
      return;
    }
    setAdding(true);
    const res = await fetch("/api/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ identifier: identifier.trim(), role: newRole })
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setAddError(data.error || "Could not add staff member.");
      return;
    }
    setIdentifier("");
    load();
  }

  async function removeStaff(userId: string) {
    await fetch(`/api/admin-users?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: authHeaders
    });
    load();
  }

  if (!ready) {
    return (
      <div className="max-w-sm mx-auto px-5 py-24">
        <Spinner />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-5 py-24">
        <h2 className="font-serif text-red-dark text-xl mb-1.5">Admin sign-in</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && tryPassword()}
          placeholder="Admin password"
          className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-card mb-3 focus:outline-none focus:border-gold"
        />
        {passwordError && <div className="text-[12.5px] text-red-dark mb-3">{passwordError}</div>}
        <button
          onClick={tryPassword}
          className="w-full py-3 rounded-full font-semibold text-sm bg-red text-[#FBF6EE] hover:bg-red-dark"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 pb-16">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-red-dark text-2xl mb-1">Staff</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">
            Sign out
          </button>
          <Link href="/" className="text-sm text-ink-soft underline">
            Back to store
          </Link>
        </div>
      </div>

      <AdminNav active="/admin/staff" />

      {role !== "owner" ? (
        <div className="bg-card border border-line rounded-xl px-5 py-8 text-center text-sm text-ink-soft">
          Only the owner can manage staff accounts.
        </div>
      ) : (
        <>
          <div className="bg-card border border-line rounded-xl px-5 py-5 mb-6">
            <div className="text-[13px] font-semibold text-ink mb-3">Add staff member</div>
            <p className="text-[12px] text-ink-soft mb-3">
              They need to have signed in at least once already (via the regular
              Sign in on the site) before you can add them here.
            </p>
            <div className="flex gap-2 flex-wrap">
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Phone number or email"
                className="flex-1 min-w-[180px] border border-line rounded-lg px-3 py-2.5 text-sm bg-cream"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="border border-line rounded-lg px-3 py-2.5 text-sm bg-cream"
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
              <button
                onClick={addStaff}
                disabled={adding}
                className="rounded-full px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
            {addError && <div className="text-[12.5px] text-red-dark mt-2.5">{addError}</div>}
          </div>

          {loading ? (
            <Spinner />
          ) : staff.length === 0 ? (
            <div className="text-sm text-ink-soft">No staff added yet.</div>
          ) : (
            <div className="space-y-2.5">
              {staff.map((s) => (
                <div
                  key={s.user_id}
                  className="border border-line rounded-xl bg-card px-4 py-3.5 flex items-center gap-3 flex-wrap"
                >
                  <div className="flex-1 min-w-[140px]">
                    <div className="font-semibold text-[13.5px]">{s.phone || s.email}</div>
                    <div className="text-[11px] text-ink-soft">
                      Added {new Date(s.added_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                      s.role === "owner" ? "bg-[#FBF3E0] text-gold" : "bg-cream-2 text-ink-soft"
                    }`}
                  >
                    {s.role}
                  </span>
                  <button
                    onClick={() => removeStaff(s.user_id)}
                    className="text-[11px] text-red-dark underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
