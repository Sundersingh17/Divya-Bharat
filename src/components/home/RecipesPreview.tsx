"use client";

import Link from "next/link";
import { BlogPost } from "@/lib/blog";
import { Container, Reveal, SectionHeading } from "../ui";

export default function RecipesPreview({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;
  const [featured, ...rest] = posts;

  return (
    <section className="section-pad bg-sand">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="From the journal"
            title="Recipes & Guides"
            action={
              <Link href="/blog" className="hidden text-[12px] font-semibold uppercase tracking-[.08em] text-red hover:text-red-dark md:block">
                View all →
              </Link>
            }
          />
        </Reveal>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.35fr_1fr] md:gap-12">
          <Reveal>
            <Link href={`/blog/${featured.id}`} className="group block">
              <div className="aspect-[4/3] w-full overflow-hidden bg-cream">
                {featured.cover_image_url ? (
                  <img
                    src={featured.cover_image_url}
                    alt={featured.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-sand">
                    <i className="ti ti-book text-[32px] text-ink-soft" aria-hidden="true" />
                  </div>
                )}
              </div>
              {featured.category && <div className="mt-4 eyebrow">{featured.category}</div>}
              <h3 className="mt-2 font-serif text-[24px] font-semibold leading-tight text-ink group-hover:text-red-dark">
                {featured.title}
              </h3>
              {featured.excerpt && <p className="mt-2 text-[13.5px] text-ink-soft">{featured.excerpt}</p>}
            </Link>
          </Reveal>
          <div className="flex flex-col gap-6">
            {rest.map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <Link href={`/blog/${p.id}`} className="group flex gap-4">
                  <div className="h-24 w-28 flex-shrink-0 overflow-hidden bg-cream">
                    {p.cover_image_url ? (
                      <img src={p.cover_image_url} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-sand">
                        <i className="ti ti-book text-[18px] text-ink-soft" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    {p.category && <div className="text-[10px] font-semibold uppercase tracking-eyebrow text-red">{p.category}</div>}
                    <h4 className="mt-1 font-serif text-[16px] font-semibold leading-snug text-ink group-hover:text-red-dark">
                      {p.title}
                    </h4>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
