"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function RestoreCartPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "restored" | "error" | "converted">("loading");

  useEffect(() => {
    fetch(`/api/cart-snapshot?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus("error");
          return;
        }
        if (data.converted) {
          setStatus("converted");
          return;
        }
        // Restore into the same localStorage shape CartContext reads on
        // mount: { [productId]: {qty} } is NOT the shape — CartContext
        // stores an array of CartItem. Rebuild that shape here.
        const cartItems = (data.items as any[]).map((i) => ({
          productId: i.productId,
          variantId: i.variantId ?? i.productId,
          packSize: i.packSize ?? "",
          name: i.name,
          nameOdia: i.nameOdia,
          price: i.price,
          qty: i.qty,
          categoryId: i.categoryId
        }));
        localStorage.setItem("db_cart_v1", JSON.stringify(cartItems));
        setStatus("restored");
        setTimeout(() => router.push("/checkout"), 1200);
      })
      .catch(() => setStatus("error"));
  }, [token, router]);

  return (
    <>
      <Header categories={[]} />
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        {status === "loading" && <p className="text-sm text-ink-soft">Restoring your cart…</p>}
        {status === "restored" && (
          <>
            <div className="w-14 h-14 rounded-full bg-sage text-white flex items-center justify-center text-2xl mx-auto mb-4">
              ✓
            </div>
            <p className="text-sm text-ink-soft">Your cart is back — taking you to checkout…</p>
          </>
        )}
        {status === "converted" && (
          <p className="text-sm text-ink-soft">
            This cart was already checked out. Head to the{" "}
            <a href="/" className="underline text-red-dark">
              shop
            </a>{" "}
            to start a new order.
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-ink-soft">
            This link has expired or is invalid.{" "}
            <a href="/" className="underline text-red-dark">
              Go to the shop
            </a>
            .
          </p>
        )}
      </div>
      <Footer />
    </>
  );
}
