"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Spinner from "@/components/Spinner";
import { useAdminAccess } from "@/lib/useAdminAccess";

type QuestionRow = {
  id: string;
  product_id: string;
  product_name: string;
  question: string;
  answer: string | null;
  created_at: string;
};

export default function AdminQuestionsPage() {
  const { ready, authed, authHeaders, password, setPassword, tryPassword, passwordError, signOutAdmin } =
    useAdminAccess();
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [onlyUnanswered, setOnlyUnanswered] = useState(true);

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin-questions", { headers: authHeaders });
    if (res.ok) setQuestions((await res.json()).questions ?? []);
    setLoading(false);
  }

  async function submitAnswer(id: string) {
    const answer = (drafts[id] ?? "").trim();
    if (!answer) return;
    setSavingId(id);
    await fetch("/api/admin-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ id, answer })
    });
    setSavingId(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this question?")) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    await fetch(`/api/admin-questions?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders });
  }

  const visible = onlyUnanswered ? questions.filter((q) => !q.answer) : questions;

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
    <div className="max-w-3xl mx-auto px-5 py-10 pb-16">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-red-dark text-2xl mb-1">Questions &amp; Answers</h2>
        <div className="flex items-center gap-4">
          <button onClick={signOutAdmin} className="text-[12.5px] text-ink-soft underline">
            Sign out
          </button>
          <Link href="/" className="text-sm text-ink-soft underline">
            Back to store
          </Link>
        </div>
      </div>

      <AdminNav active="/admin/questions" />

      <label className="flex items-center gap-1.5 text-[12.5px] text-ink-soft my-5">
        <input type="checkbox" checked={onlyUnanswered} onChange={(e) => setOnlyUnanswered(e.target.checked)} />
        Show unanswered only
      </label>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <div className="text-sm text-ink-soft">
          {onlyUnanswered ? "No unanswered questions — nice." : "No questions yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((q) => (
            <div key={q.id} className="border border-line rounded-xl bg-card px-5 py-4">
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <div className="text-[11px] text-ink-soft mb-1">{q.product_name}</div>
                  <div className="text-[13.5px] font-medium text-ink">{q.question}</div>
                </div>
                <span className="text-[10.5px] text-ink-soft/70 whitespace-nowrap">
                  {new Date(q.created_at).toLocaleDateString()}
                </span>
              </div>

              {q.answer ? (
                <div className="text-[12.5px] text-sage bg-[#EBF0E4] rounded-lg px-3 py-2 mt-2">{q.answer}</div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={drafts[q.id] ?? ""}
                    onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && submitAnswer(q.id)}
                    placeholder="Type your answer…"
                    className="flex-1 border border-line rounded-lg px-3 py-2 text-[13px] bg-cream focus:outline-none focus:border-gold"
                  />
                  <button
                    onClick={() => submitAnswer(q.id)}
                    disabled={savingId === q.id}
                    className="text-[12px] font-semibold px-3.5 py-2 rounded-lg bg-red text-[#FBF6EE] hover:bg-red-dark disabled:opacity-60"
                  >
                    {savingId === q.id ? "…" : "Answer"}
                  </button>
                </div>
              )}
              <button
                onClick={() => remove(q.id)}
                className="text-[11px] text-ink-soft underline hover:text-red-dark mt-2"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
