import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Restore Your Cart | Divya Bharat",
  robots: { index: false, follow: false }
};

export default function CartRestoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
