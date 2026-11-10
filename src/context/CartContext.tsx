"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CartItem } from "@/lib/types";

type CartContextType = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  changeQty: (variantId: string, delta: number) => void;
  removeItem: (variantId: string) => void;
  qtyForVariant: (variantId: string) => number;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const STORAGE_KEY = "db_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Backward compat: cart items saved before variants existed have
        // no variantId/packSize — fall back to productId as the key so
        // old carts don't silently disappear.
        setItems(
          parsed.map((i: any) => ({
            ...i,
            variantId: i.variantId ?? i.productId,
            packSize: i.packSize ?? ""
          }))
        );
      }
    } catch {
      // ignore corrupt local storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(item: Omit<CartItem, "qty">, qty: number = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...prev, { ...item, qty }];
    });
  }

  function changeQty(variantId: string, delta: number) {
    setItems((prev) => {
      const next = prev.map((i) =>
        i.variantId === variantId ? { ...i, qty: i.qty + delta } : i
      );
      return next.filter((i) => i.qty > 0);
    });
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  function qtyForVariant(variantId: string) {
    return items.find((i) => i.variantId === variantId)?.qty ?? 0;
  }

  function clearCart() {
    setItems([]);
  }

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  return (
    <CartContext.Provider
      value={{ items, count, subtotal, addItem, changeQty, removeItem, qtyForVariant, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
