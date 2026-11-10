"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

type Address = {
  id: string;
  label: string;
  full_address: string;
  is_default: boolean;
};

export default function AddressSection() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("Home");
  const [fullAddress, setFullAddress] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setAddresses(data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function addAddress() {
    if (!user || !fullAddress.trim()) return;
    setSaving(true);
    const isFirst = (addresses?.length ?? 0) === 0;
    await supabase.from("addresses").insert({
      user_id: user.id,
      label: label.trim() || "Home",
      full_address: fullAddress.trim(),
      is_default: isFirst
    });
    setSaving(false);
    setFullAddress("");
    setLabel("Home");
    setShowForm(false);
    load();
  }

  async function removeAddress(id: string) {
    if (!user) return;
    await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
    load();
  }

  async function makeDefault(id: string) {
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id);
    load();
  }

  if (addresses === null) return <div className="text-sm text-ink-soft text-center py-8">Loading…</div>;

  return (
    <div>
      {addresses.length === 0 ? (
        <div className="text-sm text-ink-soft text-center py-6">No saved addresses yet.</div>
      ) : (
        <div className="space-y-3 mb-5">
          {addresses.map((a) => (
            <div key={a.id} className="border border-line rounded-xl bg-card px-4 py-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold text-ink">{a.label}</span>
                  {a.is_default && (
                    <span className="text-[9.5px] font-bold text-sage bg-[#EAF0DF] px-2 py-0.5 rounded-full uppercase">
                      Default
                    </span>
                  )}
                </div>
                <button onClick={() => removeAddress(a.id)} className="text-[11px] text-red-dark underline">
                  Remove
                </button>
              </div>
              <p className="text-[12.5px] text-ink-soft leading-relaxed mb-2">{a.full_address}</p>
              {!a.is_default && (
                <button onClick={() => makeDefault(a.id)} className="text-[11px] font-semibold text-ink-soft underline">
                  Set as default
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="bg-cream rounded-xl px-4 py-4">
          <div className="flex gap-2 mb-2.5">
            {["Home", "Work", "Other"].map((l) => (
              <button
                key={l}
                onClick={() => setLabel(l)}
                className={`text-[11.5px] px-3 py-1.5 rounded-full border transition-colors ${
                  label === l ? "bg-ink text-cream border-ink" : "border-line text-ink-soft"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <textarea
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
            rows={3}
            placeholder="House number, street, city, state, PIN code"
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-card mb-3 focus:outline-none focus:border-gold"
          />
          <div className="flex gap-2">
            <button
              onClick={addAddress}
              disabled={saving}
              className="rounded-full px-5 py-2.5 text-[13px] font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save address"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-full px-5 py-2.5 text-[13px] font-semibold border border-line text-ink-soft"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-[12.5px] font-semibold text-red-dark border border-line rounded-full px-4 py-2 hover:border-gold transition-colors"
        >
          + Add address
        </button>
      )}
    </div>
  );
}
