import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns & Refunds | Divya Bharat",
  robots: { index: false, follow: false }
};

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
