import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import { getCategories, getProducts, getActiveDailyOffers, getFeaturedReviews } from "@/lib/catalog";
import { getBlogPosts } from "@/lib/blog";
import { getLandingPages } from "@/lib/landingPages";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300; // re-fetch product data from Supabase every 5 minutes

export const metadata: Metadata = {
  title: "Divya Bharat Food Processing Centre — Odisha Mustard Oil, Chhatua & Dal Online",
  description:
    "Buy cold-pressed kachi ghani mustard oil, coconut oil, groundnut oil, chhatua (sattu), dal, spices and more — traditionally processed in Odisha, delivered pan-India.",
  alternates: { canonical: "/" }
};

export default async function Page() {
  const [categories, products, dailyOffers, reviews, posts, useCases] = await Promise.all([
    getCategories(),
    getProducts(),
    getActiveDailyOffers(),
    getFeaturedReviews(3),
    getBlogPosts(),
    getLandingPages("use-case")
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Divya Bharat Food Processing Centre",
    url: SITE_URL,
    ...(process.env.NEXT_PUBLIC_INSTAGRAM_URL ? { sameAs: [process.env.NEXT_PUBLIC_INSTAGRAM_URL] } : {}),
    description:
      "Traditional Odisha food processing centre selling cold-pressed oils, chhatua, dal, and spices.",
    address: {
      "@type": "PostalAddress",
      addressRegion: "Odisha",
      addressCountry: "IN"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient
        initialCategories={categories}
        initialProducts={products}
        initialOffers={dailyOffers}
        reviews={reviews}
        posts={posts.slice(0, 3)}
        useCases={useCases.slice(0, 6)}
      />
    </>
  );
}
