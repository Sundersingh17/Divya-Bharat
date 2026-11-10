import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Container, Reveal } from "@/components/ui";
import { getCategories } from "@/lib/catalog";
import { getLandingPages } from "@/lib/landingPages";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shop by Need | Divya Bharat",
  description: "Find the right Divya Bharat product for your specific need — diet, cooking style, or occasion."
};

export default async function UseCaseIndexPage() {
  const [pages, categories] = await Promise.all([getLandingPages("use-case"), getCategories()]);
  return (
    <>
      <Header categories={categories} />
      <div className="section-pad">
        <Container>
          <Reveal className="mb-12 max-w-xl">
            <div className="eyebrow mb-3">Find your fit</div>
            <h1 className="heading-section text-[36px] md:text-[44px]">Shop by Need</h1>
          </Reveal>
          {pages.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-soft">Nothing published yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {pages.map((p, i) => (
                <Reveal key={p.id} delay={(i % 2) * 60}>
                  <Link
                    href={`/use-case/${p.id}`}
                    className="group flex h-full flex-col justify-between border border-line bg-warm p-6 transition-colors hover:border-ink"
                  >
                    <div>
                      <h2 className="font-serif text-[19px] font-semibold text-ink">{p.title}</h2>
                      {p.subtitle && <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{p.subtitle}</p>}
                    </div>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-red">
                      Shop this
                      <i className="ti ti-arrow-right text-[13px] transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </div>
      <Footer />
    </>
  );
}
