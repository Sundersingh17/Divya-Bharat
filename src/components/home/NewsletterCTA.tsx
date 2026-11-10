"use client";

import { useState } from "react";
import { Container } from "../ui";

export default function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not sign you up.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Could not sign you up. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section className="grain relative bg-ink text-warm" aria-labelledby="newsletter-heading">
      <Container className="grid grid-cols-1 gap-8 py-14 md:grid-cols-[1.2fr_1fr] md:items-end md:gap-14 md:py-20">
        <div>
          <h2 id="newsletter-heading" className="font-serif text-[34px] font-bold uppercase leading-[.95] tracking-[-0.02em] sm:text-[46px] md:text-[60px]">
            Stay close
            <br />
            to the pantry.
          </h2>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-warm/65">
            <li>New products</li>
            <li>Recipes</li>
            <li>Seasonal favourites</li>
          </ul>
        </div>

        {status === "done" ? (
          <div role="status" className="flex items-center gap-3 border border-turmeric/60 px-6 py-5 text-[14px] font-semibold text-turmeric">
            <i className="ti ti-circle-check text-[20px]" aria-hidden="true" />
            You're on the list. Welcome to the pantry.
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label htmlFor="newsletter-email" className="text-[11px] font-semibold uppercase tracking-eyebrow text-warm/60">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border-b-2 border-warm/30 bg-transparent px-0 py-3 text-[18px] text-warm placeholder:text-warm/30 focus:border-turmeric focus:outline-none"
            />
            <button type="submit" disabled={status === "loading"} className="btn-light mt-3 self-start">
              {status === "loading" ? "Joining…" : "Subscribe"}
              <i className="ti ti-arrow-right text-[15px]" aria-hidden="true" />
            </button>
            {error && <div role="alert" className="text-[12px] text-gold-soft">{error}</div>}
            <p className="text-[11.5px] text-warm/45">One email a month, at most. No spam.</p>
          </form>
        )}
      </Container>
    </section>
  );
}
