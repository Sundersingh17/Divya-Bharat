"use client";

import { FeaturedReview } from "@/lib/catalog";
import { Container, Rating, Reveal, SectionHeading } from "../ui";

// Real reviews only (see lib/catalog.ts#getFeaturedReviews) — renders
// nothing until there are at least a few genuine 4★+ written reviews.
export default function TrustSection({ reviews }: { reviews: FeaturedReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="section-pad bg-warm">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="From our customers" title="What people are saying" align="center" />
        </Reveal>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {reviews.map((r, i) => (
            <Reveal key={r.id} delay={i * 80} className="bg-cream p-7">
              <Rating value={r.rating} />
              <p className="mt-4 text-[14px] leading-relaxed text-ink">"{r.review_text}"</p>
              <div className="mt-5 flex items-center justify-between text-[11.5px] text-ink-soft">
                <span>{r.product_name}</span>
                {r.is_verified_purchase && (
                  <span className="flex items-center gap-1 font-semibold text-leaf">
                    <i className="ti ti-circle-check text-[13px]" aria-hidden="true" />
                    Verified purchase
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
