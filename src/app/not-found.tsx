import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Container, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <Header categories={[]} />
      <div className="section-pad">
        <Container>
          <EmptyState
            title="We couldn't find that page."
            text="The link may be old, or the product may no longer be available."
            ctaLabel="Explore products"
            ctaHref="/collections"
          />
        </Container>
      </div>
      <Footer />
    </>
  );
}
