import { MetadataRoute } from "next";
import { getProducts } from "@/lib/catalog";
import { getBlogPosts } from "@/lib/blog";
import { getLandingPages } from "@/lib/landingPages";

import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts, useCases, collections] = await Promise.all([
    getProducts(),
    getBlogPosts(),
    getLandingPages("use-case"),
    getLandingPages("collection")
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/help`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/offers`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/membership`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/use-case`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/collections`, changeFrequency: "weekly", priority: 0.6 }
  ];

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/product/${p.id}`,
    changeFrequency: "weekly",
    priority: 0.8
  }));

  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.id}`,
    lastModified: p.updated_at,
    changeFrequency: "monthly",
    priority: 0.6
  }));

  const useCasePages: MetadataRoute.Sitemap = useCases.map((p) => ({
    url: `${SITE_URL}/use-case/${p.id}`,
    lastModified: p.updated_at,
    changeFrequency: "monthly",
    priority: 0.7
  }));

  const collectionPages: MetadataRoute.Sitemap = collections.map((p) => ({
    url: `${SITE_URL}/collections/${p.id}`,
    lastModified: p.updated_at,
    changeFrequency: "monthly",
    priority: 0.7
  }));

  return [...staticPages, ...productPages, ...blogPages, ...useCasePages, ...collectionPages];
}
