import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Container, Reveal } from "@/components/ui";
import { getCategories } from "@/lib/catalog";
import { getBlogPosts } from "@/lib/blog";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Recipes & Guides | Divya Bharat Food Processing Centre",
  description:
    "Recipes, nutrition guides, and behind-the-scenes stories on how Divya Bharat's cold-pressed oils, chhatua, dal and spices are made in Odisha.",
  alternates: { canonical: "/blog" }
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default async function BlogIndexPage() {
  const [posts, categories] = await Promise.all([getBlogPosts(), getCategories()]);
  const [featured, ...rest] = posts;

  return (
    <>
      <Header categories={categories} />
      <div className="section-pad">
        <Container>
          <Reveal className="mb-12 max-w-xl">
            <div className="eyebrow mb-3">The Journal</div>
            <h1 className="heading-section text-[36px] md:text-[44px]">Recipes &amp; Guides</h1>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
              Recipes, nutrition notes, and stories from the mill floor — straight from Divya Bharat.
            </p>
          </Reveal>

          {posts.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-soft">Nothing published yet — check back soon.</div>
          ) : (
            <>
              <Reveal className="mb-16">
                <Link href={`/blog/${featured.id}`} className="group grid grid-cols-1 gap-7 md:grid-cols-2 md:gap-12">
                  <div className="aspect-[16/11] w-full overflow-hidden bg-cream-2">
                    {featured.cover_image_url ? (
                      <img
                        src={featured.cover_image_url}
                        alt={featured.title}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <i className="ti ti-book text-[36px] text-ink-soft" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    {featured.category && <div className="eyebrow mb-3">{featured.category}</div>}
                    <h2 className="font-serif text-[28px] font-semibold leading-tight text-ink group-hover:text-red-dark md:text-[34px]">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-soft">{featured.excerpt}</p>
                    )}
                    <div className="mt-5 text-[11.5px] text-ink-soft">{fmt(featured.published_at)}</div>
                  </div>
                </Link>
              </Reveal>

              {rest.length > 0 && (
                <div className="grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post, i) => (
                    <Reveal key={post.id} delay={(i % 3) * 60}>
                      <Link href={`/blog/${post.id}`} className="group block">
                        <div className="aspect-[4/3] w-full overflow-hidden bg-cream-2">
                          {post.cover_image_url ? (
                            <img
                              src={post.cover_image_url}
                              alt={post.title}
                              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <i className="ti ti-book text-[24px] text-ink-soft" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="pt-4">
                          {post.category && (
                            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-eyebrow text-red">
                              {post.category}
                            </div>
                          )}
                          <h3 className="font-serif text-[18px] font-semibold leading-snug text-ink group-hover:text-red-dark">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="mt-1.5 line-clamp-2 text-[12.5px] text-ink-soft">{post.excerpt}</p>
                          )}
                          <div className="mt-2.5 text-[11px] text-ink-soft/70">{fmt(post.published_at)}</div>
                        </div>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              )}
            </>
          )}
        </Container>
      </div>
      <Footer />
    </>
  );
}
