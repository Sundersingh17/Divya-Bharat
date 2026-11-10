"use client";

import { useEffect, useState } from "react";
import { StarDisplay, StarInput } from "./StarRating";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Review } from "@/lib/types";

export default function ReviewSection({ productId }: { productId: string }) {
  const { user, accessToken } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []));
  }, [productId]);

  const myReview = user ? reviews?.find((r) => r.user_id === user.id) : undefined;
  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  async function submitReview() {
    if (!user) {
      showToast("Please sign in to leave a review.", "err");
      return;
    }
    if (rating === 0) {
      showToast("Please select a star rating.", "err");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ productId, rating, reviewText: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Thanks for your review!");
      setShowForm(false);
      const refreshed = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
      setReviews((await refreshed.json()).reviews ?? []);
    } catch (err: any) {
      showToast(err.message || "Could not save your review.", "err");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-10 pt-8 border-t border-line">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[13px] font-semibold text-ink uppercase tracking-wide mb-1.5">
            Reviews
          </h2>
          {reviews && reviews.length > 0 ? (
            <div className="flex items-center gap-2">
              <StarDisplay rating={avgRating} size="text-base" />
              <span className="text-[12.5px] text-ink-soft">
                {avgRating.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <span className="text-[12.5px] text-ink-soft">No reviews yet</span>
          )}
        </div>
        {user && !myReview && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-[12.5px] font-semibold text-red-dark border border-ink px-4 py-2 hover:bg-ink hover:text-cream transition-colors"
          >
            Write a review
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-cream border-l-2 border-ink px-5 py-5 mb-6">
          <div className="mb-3">
            <StarInput value={rating} onChange={setRating} />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts on this product (optional)"
            rows={3}
            className="w-full border border-line px-3 py-2.5 text-sm bg-card mb-3 focus:outline-none focus:border-ink"
          />
          <button
            onClick={submitReview}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </div>
      )}

      {!reviews ? (
        <div className="text-sm text-ink-soft">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="text-sm text-ink-soft">
          Be the first to review this product{!user && " (sign in required)"}.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-line pb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <StarDisplay rating={r.rating} />
                {r.is_verified_purchase && (
                  <span className="text-[10px] font-semibold text-sage bg-[#EBF0E4] px-2 py-0.5 uppercase tracking-wide">
                    Verified purchase
                  </span>
                )}
                <span className="text-[11px] text-ink-soft ml-auto">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.review_text && <p className="text-[13px] text-ink-soft leading-relaxed">{r.review_text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
