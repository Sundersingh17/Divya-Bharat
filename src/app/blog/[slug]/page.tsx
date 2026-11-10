import ProductGrid from "@/components/ProductGrid";
import { getProductsInPost } from "@/lib/recipes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marked } from "marked";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCategories } from "@/lib/catalog";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/blog";

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) return { title: "Post not found" };

  const description = post.excerpt || post.content.slice(0, 155);
  return {
    title: `${post.title} | Divya Bharat`,
    description,
    alternates: { canonical: `/blog/${post.id}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      images: post.cover_image_url ? [post.cover_image_url] : undefined
    }
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, categories] = await Promise.all([getBlogPostBySlug(params.slug), getCategories()]);
  if (!post) notFound();

  const linkedProducts = await getProductsInPost(post);
  const html = marked.parse(post.content, { async: false }) as string;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: "Divya Bharat Food Processing Centre" }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header categories={categories} />
      <article className="section-pad">
        <div className="container-page max-w-[760px]">
          {post.category && <div className="eyebrow mb-3">{post.category}</div>}
          <h1 className="heading-section text-[32px] leading-tight md:text-[42px]">{post.title}</h1>
          <div className="mt-4 text-[12px] text-ink-soft">
            {new Date(post.published_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </div>
          {post.cover_image_url && (
            <img src={post.cover_image_url} alt={post.title} className="mt-8 mb-9 max-h-[460px] w-full object-cover" />
          )}
          <div
            className="text-[15px] max-w-none text-ink leading-[1.8] [&_h2]:font-serif [&_h2]:text-[22px] [&_h2]:text-red-dark [&_h2]:mt-9 [&_h2]:mb-3 [&_h3]:font-serif [&_h3]:text-[18px] [&_h3]:text-red-dark [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-5 [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-red-dark [&_a]:underline [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {linkedProducts.length > 0 && (
            <section className="mt-14 border-t border-line pt-8" aria-labelledby="recipe-products">
              <h2 id="recipe-products" className="mb-6 font-serif text-[22px] text-red-dark">Products in this recipe</h2>
              <ProductGrid products={linkedProducts} loading={false} />
            </section>
          )}
        </div>
      </article>
      <Footer />
    </>
  );
}
