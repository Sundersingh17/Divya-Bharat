"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function RestockNotify({ variantId, packSize }: { variantId: string; packSize: string }) {
  const { user, accessToken } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError("");
    try {
      const res = await fetch("/api/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ variantId, email: email || user?.email || "" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your request.");
      setState("done");
    } catch (err: any) {
      setError(err.message || "Could not save your request.");
      setState("idle");
    }
  }

  if (state === "done") {
    return <p className="mt-4 text-[13px] text-leaf" role="status">Thanks — we'll email you when {packSize} is back.</p>;
  }
  return (
    <form onSubmit={submit} className="mt-4 max-w-md border border-line bg-card p-4">
      <p className="mb-2 text-[13px] font-semibold text-ink">Out of stock in {packSize}. Notify me when it's back</p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={user?.email ?? "you@example.com"}
          aria-label="Email for restock notification"
          className="min-w-0 flex-1 border border-line bg-warm px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
        <button type="submit" disabled={state === "saving"} className="btn-primary !py-2 !px-4 !text-[12.5px]">
          {state === "saving" ? "Saving…" : "Notify me"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-[12px] text-red-dark">{error}</p>}
    </form>
  );
}
