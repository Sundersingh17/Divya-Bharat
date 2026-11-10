"use client";

import { useEffect, useState } from "react";

// "3d": wide screen and the visitor has not asked for reduced motion.
// "2d": phones, tablets and reduced-motion — simple swipeable shelves.
// null: not known yet (first render), so nothing heavy is drawn.
export function usePantryMode(): "3d" | "2d" | null {
  const [mode, setMode] = useState<"3d" | "2d" | null>(null);
  useEffect(() => {
    const q = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    const apply = () => setMode(q.matches ? "3d" : "2d");
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);
  return mode;
}
