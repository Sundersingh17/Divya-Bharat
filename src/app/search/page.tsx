import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { robots: { index: false, follow: true } };

// /search is a compatible entry point for the single catalogue search at /collections.
export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  redirect(q ? `/collections?q=${encodeURIComponent(q)}` : "/collections");
}
