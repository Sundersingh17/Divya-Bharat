"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Product } from "@/lib/types";
import ProductImage, { getGalleryUrls } from "../ProductImage";
import { Container, Reveal } from "../ui";
import { SITE_IMAGES } from "@/lib/siteImages";

const STEPS = [
  {
    n: "01",
    title: "Source",
    text: "Mustard, groundnut, sesame, dal and grain, bought from growers across Odisha, the same way Divya Bharat has stocked its offline counter for years.",
    photo: SITE_IMAGES.storyOdisha,
    prefer: ["dal", "oils"]
  },
  {
    n: "02",
    title: "Process",
    text: "No chemical extraction. Oils are cold-pressed slowly (kachi ghani); chhatua and flours are stone-ground, the traditional way.",
    photo: SITE_IMAGES.storyProcess,
    prefer: ["oils", "chhatua"]
  },
  {
    n: "03",
    title: "Pack",
    text: "Sealed and labelled in Odisha, so what reaches you is what left the mill.",
    photo: SITE_IMAGES.storyBand,
    prefer: ["chhatua", "spices", "flours"]
  },
  {
    n: "04",
    title: "Deliver",
    text: "Shipped pan-India. What was once only at our Odisha counter now arrives at your door.",
    photo: SITE_IMAGES.storyDelivery,
    prefer: ["bundles", "papad", "spices"]
  }
];

// One scroll listener drives both the active step and the drawn line.
// The page scrolls completely normally; the image column is merely
// `position: sticky`, so nothing is hijacked. Real brand photos (via
// SITE_IMAGES) win; otherwise it uses your real product photography.
export default function BrandStory({ products }: { products: Product[] }) {
  const stepsRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const withPhoto = products.filter((p) => getGalleryUrls(p).length > 0);
  const pool = withPhoto.length ? withPhoto : products;
  const used = new Set<string>();
  const imageFor = STEPS.map((s) => {
    const pick =
      pool.find((p) => s.prefer.includes(p.category_id) && !used.has(p.id)) ??
      pool.find((p) => !used.has(p.id)) ??
      pool[0];
    if (pick) used.add(pick.id);
    return pick;
  });

  useEffect(() => {
    const el = stepsRef.current;
    if (!el) return;
    let raf = 0;
    function update() {
      const rect = el!.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh * 0.5;
      const p = Math.max(0, Math.min(1, (vh * 0.5 - rect.top) / Math.max(total, 1)));
      lineRef.current?.style.setProperty("--fill", p.toFixed(4));
      const idx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
      setActive((cur) => (cur === idx ? cur : idx));
    }
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section className="grain relative bg-ink text-warm" aria-label="Our story">
      <Container className="pt-14 md:pt-20">
        <Reveal>
          <div className="eyebrow !text-turmeric mb-5">Our story</div>
          <h2 className="font-serif text-[40px] font-bold uppercase leading-[.94] tracking-[-0.02em] text-warm sm:text-[56px] md:text-[72px] lg:text-[88px]">
            A pantry
            <br />
            with a story.
          </h2>
        </Reveal>
      </Container>

      <Container className="grid grid-cols-1 gap-x-12 pb-14 pt-8 md:grid-cols-2 md:pb-20 md:pt-12">
        {/* Image column: sticky, crossfades between steps */}
        <div className="sticky top-[104px] z-10 -mx-5 mb-6 h-[36vh] overflow-hidden bg-ink md:top-[128px] md:mx-0 md:mb-0 md:h-[62vh] md:self-start">
          {STEPS.map((s, i) => {
            const prod = imageFor[i];
            return (
              <div
                key={s.n}
                aria-hidden={active !== i}
                className={`absolute inset-0 transition-all duration-editorial ease-brand ${
                  active === i ? "scale-100 opacity-100" : "scale-[1.06] opacity-0"
                }`}
              >
                {s.photo ? (
                  <Image src={s.photo} alt={s.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                ) : prod ? (
                  <ProductImage
                    productId={prod.id}
                    categoryId={prod.category_id}
                    alt={s.title}
                    className="h-full w-full"
                    iconSize="text-6xl"
                    imageUrl={getGalleryUrls(prod)[0] ?? null}
                  />
                ) : (
                  <div className="h-full w-full bg-leaf" />
                )}
              </div>
            );
          })}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-5 font-serif text-[48px] font-semibold leading-none text-warm/90 md:bottom-5 md:left-6 md:text-[72px]">
            {STEPS[active].n}
          </div>
        </div>

        {/* Steps: normal scrolling content with a progressively drawn line */}
        <div ref={stepsRef} className="relative pl-8 md:pl-12">
          <div className="absolute bottom-0 left-0 top-0 w-px bg-warm/20" aria-hidden="true">
            <div
              ref={lineRef}
              className="story-line absolute left-0 top-0 w-full bg-turmeric"
              style={{ ["--fill" as any]: 0 }}
            />
          </div>
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex min-h-[38vh] flex-col justify-center py-6 md:min-h-[50vh]">
              <div
                className={`transition-all duration-editorial ease-brand ${
                  active === i ? "translate-x-0 opacity-100" : "translate-x-2 opacity-35"
                }`}
              >
                <div className="text-[12px] font-semibold uppercase tracking-eyebrow text-turmeric">
                  {s.n} / Step
                </div>
                <h3 className="mt-3 font-serif text-[30px] font-semibold uppercase leading-none tracking-tight text-warm md:text-[44px]">
                  {s.title}
                </h3>
                <p className="mt-4 max-w-md text-[14px] leading-relaxed text-warm/70">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
