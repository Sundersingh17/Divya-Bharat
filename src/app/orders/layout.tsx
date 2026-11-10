import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Order | Divya Bharat",
  robots: { index: false, follow: false }
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
