import { supabase } from "./supabaseClient";

export type BlogPost = {
  id: string; // slug
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string | null;
  published: boolean;
  published_at: string;
  updated_at: string;
};

export async function getBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) {
    console.error("Failed to load blog posts", error);
    return [];
  }
  return data ?? [];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) {
    console.error("Failed to load blog post", error);
    return null;
  }
  return data;
}
