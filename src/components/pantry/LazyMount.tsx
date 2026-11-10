"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

// Renders children only once the placeholder is close to the viewport, so the
// pantry code and images are not fetched until the visitor scrolls near them.
export default function LazyMount({ children, minHeight = "60vh" }: { children: ReactNode; minHeight?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return show ? <>{children}</> : <div ref={ref} style={{ minHeight }} aria-hidden="true" />;
}
