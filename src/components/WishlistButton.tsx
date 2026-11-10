"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabaseClient";

export default function WishlistButton({
  productId,
  className = ""
}: {
  productId: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [saved, setSaved] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle()
      .then(({ data }) => {
        setSaved(!!data);
        setChecked(true);
      });
  }, [user, productId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast("Sign in to save items to your wishlist.", "err");
      return;
    }
    if (saved) {
      setSaved(false);
      await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", productId);
    } else {
      setSaved(true);
      setPop(true);
      setTimeout(() => setPop(false), 400);
      await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: productId });
      showToast("Saved to wishlist");
    }
  }

  if (!checked) return null;

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      className={`transition-transform active:scale-90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`w-full h-full ${pop ? "animate-heartPop" : ""} ${saved ? "fill-red stroke-red" : "fill-none stroke-ink/60"}`}
        strokeWidth="1.8"
      >
        <path d="M12 20.5s-7.5-4.6-10-9.3C.5 8 1.8 4.5 5 3.5c2-.6 4 .2 5 2 1-1.8 3-2.6 5-2 3.2 1 4.5 4.5 3 7.7-2.5 4.7-10 9.3-10 9.3z" />
      </svg>
    </button>
  );
}
