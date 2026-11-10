"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ProductQuestion } from "@/lib/types";

export default function QASection({ productId }: { productId: string }) {
  const { user, accessToken } = useAuth();
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<ProductQuestion[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/questions?productId=${encodeURIComponent(productId)}`)
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions ?? []));
  }, [productId]);

  async function submitQuestion() {
    if (!user) {
      showToast("Please sign in to ask a question.", "err");
      return;
    }
    if (!text.trim()) {
      showToast("Please enter your question.", "err");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ productId, question: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Question submitted — we'll answer it soon.");
      setShowForm(false);
      setText("");
      const refreshed = await fetch(`/api/questions?productId=${encodeURIComponent(productId)}`);
      setQuestions((await refreshed.json()).questions ?? []);
    } catch (err: any) {
      showToast(err.message || "Could not submit your question.", "err");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-10 pt-8 border-t border-line">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[13px] font-semibold text-ink uppercase tracking-wide">
          Questions &amp; Answers
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[12.5px] font-semibold text-red-dark border border-ink px-4 py-2 hover:bg-ink hover:text-cream transition-colors"
        >
          Ask a question
        </button>
      </div>

      {showForm && (
        <div className="bg-cream border-l-2 border-ink px-5 py-5 mb-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What would you like to know about this product?"
            rows={2}
            maxLength={500}
            className="w-full border border-line px-3 py-2.5 text-sm bg-card mb-3 focus:outline-none focus:border-ink"
          />
          <button
            onClick={submitQuestion}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-semibold bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit question"}
          </button>
        </div>
      )}

      {!questions ? (
        <div className="text-sm text-ink-soft">Loading questions…</div>
      ) : questions.length === 0 ? (
        <div className="text-sm text-ink-soft">
          No questions yet. Be the first to ask{!user && " (sign in required)"}.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="border-b border-line pb-4">
              <div className="flex items-start gap-2 mb-1.5">
                <span className="text-[12px] font-bold text-red-dark shrink-0">Q:</span>
                <p className="text-[13px] text-ink flex-1">{q.question}</p>
                <span className="text-[11px] text-ink-soft shrink-0">
                  {new Date(q.created_at).toLocaleDateString()}
                </span>
              </div>
              {q.answer ? (
                <div className="flex items-start gap-2 pl-0">
                  <span className="text-[12px] font-bold text-sage shrink-0">A:</span>
                  <p className="text-[13px] text-ink-soft leading-relaxed flex-1">{q.answer}</p>
                </div>
              ) : (
                <div className="text-[12px] text-ink-soft/70 italic pl-5">Awaiting an answer</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
