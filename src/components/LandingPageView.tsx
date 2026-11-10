import { marked } from "marked";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import { Container, EmptyState, Reveal } from "@/components/ui";
import { LandingPage } from "@/lib/landingPages";
import { Product, Category } from "@/lib/types";

export default function LandingPageView({
  page,
  products,
  categories
}: {
  page: LandingPage;
  products: Product[];
  categories: Category[];
}) {
  const html = page.content ? (marked.parse(page.content, { async: false }) as string) : null;
  const kicker = page.type === "collection" ? "Collection" : "Shop by Need";

  return (
    <>
      <Header categories={categories} />

      {page.cover_image_url ? (
        <div className="relative flex h-[46vh] min-h-[280px] items-end bg-ink">
          <img src={page.cover_image_url} alt={page.title} className="absolute inset-0 h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
          <Container className="relative pb-10 pt-24 text-warm">
            <div className="eyebrow mb-3 !text-turmeric">{kicker}</div>
            <h1 className="heading-display text-[34px] text-warm md:text-[48px]">{page.title}</h1>
            {page.subtitle && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-warm/80">{page.subtitle}</p>}
          </Container>
        </div>
      ) : (
        <div className="border-b border-line bg-cream-2 py-16">
          <Container>
            <div className="eyebrow mb-3">{kicker}</div>
            <h1 className="heading-display text-[34px] md:text-[48px]">{page.title}</h1>
            {page.subtitle && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">{page.subtitle}</p>}
          </Container>
        </div>
      )}

      <div className="section-pad">
        <Container>
          {html && (
            <Reveal className="mb-14 max-w-[720px]">
              <div
                className="text-[15px] leading-[1.8] text-ink [&_h2]:font-serif [&_h2]:text-[22px] [&_h2]:text-red-dark [&_h2]:mt-7 [&_h2]:mb-2 [&_p]:mb-5 [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-red-dark [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </Reveal>
          )}

          {products.length > 0 ? (
            <>
              <Reveal className="mb-8 eyebrow">Featured products</Reveal>
              <ProductGrid products={products} loading={false} />
            </>
          ) : (
            <EmptyState title="This shelf is being stocked." text="Products for this page are coming soon." ctaLabel="Browse all products" ctaHref="/collections" />
          )}
        </Container>
      </div>
      <Footer />
    </>
  );
}
