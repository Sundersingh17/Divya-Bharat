"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/context/ToastContext";
import { REASONS } from "@/lib/returnReasons";

type ReturnRow = {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

const statusClass: Record<string, string> = {
  Requested: "bg-[#FDEBC8] text-[#8A5A0B]",
  Approved: "bg-[#DDE7F5] text-[#2A5090]",
  Rejected: "bg-[#F4DADA] text-[#8A2A2A]",
  Refunded: "bg-[#DFEFD3] text-[#3A6620]"
};

export default function ReturnsPage() {
  return (
    <Suspense fallback={null}>
      <ReturnsContent />
    </Suspense>
  );
}

function ReturnsContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [orderId, setOrderId] = useState(searchParams.get("order") ?? "");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [comments, setComments] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [lookupPhone, setLookupPhone] = useState("");
  const [myReturns, setMyReturns] = useState<ReturnRow[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("db_last_phone");
      if (saved) {
        setPhone(saved);
        setLookupPhone(saved);
      }
    } catch {
      // localStorage unavailable — falls back to manual entry
    }
  }, []);

  async function uploadPhoto(file: File) {
    if (photos.length >= 3) {
      showToast("You can attach up to 3 photos.", "err");
      return;
    }
    if (!orderId.trim()) {
      showToast("Enter your order ID first.", "err");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("orderId", orderId.trim());
      formData.append("file", file);
      const res = await fetch("/api/returns/upload-photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Upload failed.", "err");
        return;
      }
      setPhotos((prev) => [...prev, data.url]);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!orderId.trim() || !phone.trim()) {
      showToast("Please enter your order ID and phone number.", "err");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.trim(), phone: phone.trim(), reason, comments, photoUrls: photos })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Could not submit your return request.", "err");
        return;
      }
      setSubmitted(true);
      showToast("Return request submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  async function lookup() {
    if (!lookupPhone.trim()) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/returns?phone=${encodeURIComponent(lookupPhone.trim())}`);
      const data = await res.json();
      setMyReturns(data.returns ?? []);
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <>
      <Header categories={[]} />

      <div className="max-w-xl mx-auto px-5 py-10 pb-16">
        <h2 className="font-serif text-red-dark text-2xl mb-1.5">Request a return or refund</h2>
        <p className="text-[13.5px] text-ink-soft mb-6">
          Returns can be requested once your order shows as Delivered. We'll review it and get back to you.
        </p>

        {submitted ? (
          <div className="border border-line rounded-xl bg-card px-5 py-6 text-center">
            <div className="text-[15px] font-semibold text-red-dark mb-1.5">Request submitted</div>
            <div className="text-[13px] text-ink-soft">
              We've received your return request for order <b>{orderId}</b>. You can check its status below anytime
              using your phone number.
            </div>
          </div>
        ) : (
          <div className="border border-line rounded-xl bg-card px-5 py-5 mb-10 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. DB20260805A1"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Phone number used on the order</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Comments (optional)</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-cream focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                Photos (optional, up to 3) — helps us process damaged/defective claims faster
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {photos.map((url) => (
                  <img key={url} src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-line" />
                ))}
                {photos.length < 3 && (
                  <label className="w-14 h-14 flex items-center justify-center rounded-lg border border-dashed border-line text-ink-soft text-xs cursor-pointer hover:border-gold">
                    {uploading ? "…" : "+ Add"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadPhoto(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-3 rounded-full font-semibold text-sm bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit return request"}
            </button>
          </div>
        )}

        <h3 className="font-serif text-red-dark text-lg mb-2">Check a return's status</h3>
        <div className="flex gap-2 mb-5">
          <input
            type="tel"
            value={lookupPhone}
            onChange={(e) => setLookupPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="10-digit mobile number"
            className="flex-1 border border-line rounded-lg px-3.5 py-2.5 text-sm bg-card focus:outline-none focus:border-gold"
          />
          <button
            onClick={lookup}
            disabled={lookupLoading}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-ink text-cream hover:bg-ink/90 disabled:opacity-60"
          >
            {lookupLoading ? "…" : "Check"}
          </button>
        </div>

        {myReturns !== null &&
          (myReturns.length === 0 ? (
            <div className="text-sm text-ink-soft text-center py-6">No return requests found for this number.</div>
          ) : (
            <div className="space-y-2.5">
              {myReturns.map((r) => (
                <div key={r.id} className="border border-line rounded-xl bg-card px-4 py-3.5 flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <div className="font-semibold text-[13px] font-mono">{r.order_id}</div>
                    <div className="text-[11.5px] text-ink-soft">{r.reason}</div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide ${
                      statusClass[r.status] ?? "bg-cream-2 text-ink-soft"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          ))}
      </div>

      <Footer />
    </>
  );
}
