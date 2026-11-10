import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Container } from "@/components/ui";
import { getCategories } from "@/lib/catalog";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "About, Quality & Sourcing | Divya Bharat",
  description: "The story of Divya Bharat Food Processing Centre, Odisha — our range, quality documents and sourcing.",
  alternates: { canonical: "/about" }
};

export default async function AboutPage() {
  const categories = await getCategories();
  const { data: certs } = await supabase
    .from("product_certificates")
    .select("id, title, file_url, product_id")
    .order("uploaded_at", { ascending: false });
  const fssai = process.env.NEXT_PUBLIC_FSSAI_LICENSE_NUMBER;

  return (
    <>
      <Header categories={categories} />
      <div className="section-pad">
        <Container>
          <div className="max-w-2xl">
            <div className="eyebrow mb-3">Our story</div>
            <h1 className="heading-section mb-6 text-[36px] md:text-[44px]">About, quality &amp; sourcing</h1>
            <p className="text-[15px] leading-8 text-ink-soft">
              Divya Bharat Food Processing Centre has sold oils, chhatua, dal and spices offline for years. This site is
              our first step online — every product matches our current offline price list, with both English and Odia
              names shown the way they appear in our shop.
            </p>

            <h2 className="mb-3 mt-12 font-serif text-[24px] font-semibold text-ink">Our range</h2>
            <ul className="flex flex-wrap gap-2">
              {categories.filter((c) => c.id !== "bundles").map((c) => (
                <li key={c.id}>
                  <Link href={`/collections/${c.id}`} className="pill">{c.name}</Link>
                </li>
              ))}
            </ul>

            <h2 className="mb-3 mt-12 font-serif text-[24px] font-semibold text-ink">Quality documents</h2>
            {fssai && <p className="mb-3 text-[14px] text-ink-soft">FSSAI licence: {fssai}</p>}
            {certs && certs.length > 0 ? (
              <ul className="space-y-2 text-[14px]">
                {certs.map((c: any) => (
                  <li key={c.id}>
                    <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-red-dark underline underline-offset-4">
                      {c.title}
                    </a>{" "}
                    <Link href={`/product/${c.product_id}`} className="text-[12px] text-ink-soft">(view product)</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-soft">Certificates and lab reports will be published here as they are uploaded.</p>
            )}

            <p className="mt-12 border border-line bg-cream-2 px-4 py-3 text-[12.5px] text-ink-soft">
              Details on our production process and ingredient sourcing are being confirmed by the business and will be
              added here — we only publish what we can stand behind.
            </p>
          </div>
        </Container>
      </div>
      <Footer />
    </>
  );
}
