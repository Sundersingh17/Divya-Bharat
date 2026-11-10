import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Divya Bharat Club — Free Delivery & 10% Off Everything",
  description:
    "Join Divya Bharat Club for free delivery on every order plus 10% off all products — cold-pressed oils, chhatua, dal, and spices from Odisha.",
  alternates: { canonical: "/membership" }
};

export default function MembershipLayout({ children }: { children: React.ReactNode }) {
  return children;
}
