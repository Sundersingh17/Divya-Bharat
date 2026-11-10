import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DailyOffers from "@/components/DailyOffers";
import ProductGrid from "@/components/ProductGrid";
import { Container, EmptyState, Reveal, SectionHeading } from "@/components/ui";
import { getActiveDailyOffers, getCategories, getProducts } from "@/lib/catalog";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Offers & Combo Kits | Divya Bharat",
  description: "Today's pantry picks and combo kits from Divya Bharat Food Processing Centre.",
  alternates: { canonical: "/offers" }
};

export default async function OffersPage() {
  const [offers, products, categories] = await Promise.all([getActiveDailyOffers(), getProducts(), getCategories()]);
  const kits = products.filter((p) => p.category_id === "bundles");

  return (
    <>
      <Header categories={categories} />
      <div className="border-b border-line bg-cream-2 py-14">
        <Container>
          <div className="eyebrow mb-3">Offers</div>
          <h1 className="heading-section text-[36px] md:text-[44px]">Offers &amp; Combo Kits</h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-soft">
            Offers run while they are listed here, and prices shown are what you pay. Coupon codes are entered at
            checkout, where they are checked against your order.
          </p>
        </Container>
      </div>

      {offers.length > 0 ? (
        <DailyOffers offers={offers} />
      ) : (
        <Container>
          <EmptyState title="No offers right now." text="Check back soon — or browse the full range." ctaLabel="Shop all products" ctaHref="/collections" compact />
        </Container>
      )}

      <section className="section-pad">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Bundled" title="Combo kits" subtitle="Pantry sets priced together; the saving is shown on each kit's page." />
          </Reveal>
          {kits.length > 0 ? (
            <ProductGrid products={kits} loading={false} />
          ) : (
            <EmptyState title="No kits available." text="Combo kits will appear here when they are added." compact />
          )}
        </Container>
      </section>
      <Footer />
    </>
  );
}
