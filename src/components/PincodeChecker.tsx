"use client";

import { useEffect, useState } from "react";

type Result = { configured: boolean; serviceable?: boolean; minDays?: number; maxDays?: number; error?: string };

// Hidden until the business has loaded real serviceability data.
export default function PincodeChecker() {
  const [available, setAvailable] = useState(false);
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/pincode")
      .then((r) => r.json())
      .then((d: Result) => setAvailable(!!d.configured))
      .catch(() => setAvailable(false));
  }, []);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/pincode?pin=${encodeURIComponent(pin.trim())}`);
      setResult(await res.json());
    } catch {
      setResult({ configured: true, error: "Could not check right now." });
    } finally {
      setLoading(false);
    }
  }

  if (!available) return null;
  return (
    <form onSubmit={check} className="mt-6 max-w-md">
      <label htmlFor="pin" className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Check delivery to your PIN code</label>
      <div className="flex gap-2">
        <input id="pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="6-digit PIN" className="min-w-0 flex-1 border border-line bg-card px-3 py-2 text-sm focus:border-ink focus:outline-none" />
        <button type="submit" disabled={loading || pin.length !== 6} className="border border-ink px-4 py-2 text-[12.5px] font-semibold text-ink hover:bg-ink hover:text-cream disabled:opacity-50">
          {loading ? "Checking…" : "Check"}
        </button>
      </div>
      {result && (
        <p role="status" className="mt-2 text-[13px] text-ink-soft">
          {result.error
            ? result.error
            : result.serviceable
            ? `Delivery available — typically ${result.minDays === result.maxDays ? result.minDays : `${result.minDays}–${result.maxDays}`} days.`
            : "Sorry, we don't deliver to this PIN code yet."}
        </p>
      )}
    </form>
  );
}
