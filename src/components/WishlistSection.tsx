"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "./ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/lib/types";
import ProductImage from "./ProductImage";
import Spinner from "@/components/Spinner";

export default function WishlistSection() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [items, setItems] = useState<Product[] | null>(null);

  async function load() {
    if (!user) return;
    const { data, error } = await supabase
      .from("wishlist_items")
      .select("product_id, products(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load wishlist", error);
      setItems([]);
      return;
    }
    setItems((data ?? []).map((row: any) => row.products).filter(Boolean));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function remove(productId: string) {
    if (!user) return;
    await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", productId);
    setItems((prev) => prev?.filter((p) => p.id !== productId) ?? null);
  }

  function addToCart(p: Product) {
    addItem(
      {
        productId: p.id,
        variantId: `${p.id}-default`,
        packSize: p.pack_size,
        name: p.name,
        nameOdia: p.name_odia,
        price: p.price,
        categoryId: p.category_id
      },
      1
    );
    showToast(`${p.name} added to cart`);
  }

  if (items === null) return <Spinner />;
  if (items.length === 0) {
    return (
      <EmptyState compact title="Nothing saved yet." text="Tap the heart on anything you like and it will wait for you here." ctaLabel="Browse products" ctaHref="/collections" />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((p) => (
        <div key={p.id} className="flex gap-3.5 border border-line rounded-xl px-4 py-3.5 bg-card">
          <Link href={`/product/${p.id}`} className="w-14 h-14 rounded-lg overflow-hidden bg-cream-2 flex-shrink-0">
            <ProductImage productId={p.id} categoryId={p.category_id} alt={p.name} className="w-full h-full" iconSize="text-xl" />
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/product/${p.id}`} className="font-semibold text-[13.5px] block truncate">
              {p.name}
            </Link>
            <div className="text-[13px] font-semibold tabular-nums text-ink mt-0.5">₹{p.price}</div>
            <div className="flex gap-3 mt-1.5">
              <button onClick={() => addToCart(p)} className="text-[11.5px] font-semibold text-red-dark underline">
                Add to cart
              </button>
              <button onClick={() => remove(p.id)} className="text-[11.5px] text-ink-soft underline">
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
