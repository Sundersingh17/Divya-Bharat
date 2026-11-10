import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HelpTabs from "@/components/HelpTabs";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Help & Policies | Divya Bharat",
  description: "FAQ, contact, shipping, returns, privacy, terms and order support for Divya Bharat.",
  alternates: { canonical: "/help" }
};

export default function HelpPage() {
  return (
    <>
      <Header categories={[]} />
      <div className="section-pad">
        <Container>
          <div className="eyebrow mb-3">Support</div>
          <h1 className="heading-section mb-8 text-[36px] md:text-[44px]">Help &amp; Policies</h1>
          <HelpTabs />
        </Container>
      </div>
      <Footer />
    </>
  );
}
