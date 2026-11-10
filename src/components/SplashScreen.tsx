"use client";

import { useEffect, useState } from "react";

// App-style opening screen: warm ivory with a soft glow, a gold ring that
// draws itself around the Divya Bharat emblem, the emblem resolving from soft
// focus with a light sweep, then the wordmark and tagline rising in, and a
// gentle zoom-fade out into the page. This is a *web* splash — it is not a
// native Android/iOS launch screen.
//
// Behaviour:
//  - Rendered in the server HTML so it is the very first paint (no flash of
//    the page underneath).
//  - Shown once per browser session. An inline script in <head> (layout.tsx)
//    adds `splash-skip` to <html> before first paint on repeat loads, so
//    nothing flashes. Client-side route changes never re-mount this.
//  - Leaves as soon as the page has loaded, but is visible for at least
//    MIN_MS so the logo registers rather than flickering.
//  - prefers-reduced-motion: everything is static and it only fades.
//  - CSS failsafe (globals.css) hides it after 4.5s even if JS fails.
const MIN_MS = 1900;
const FADE_MS = 550;

export default function SplashScreen() {
  const [state, setState] = useState<"show" | "leaving" | "gone">("show");

  useEffect(() => {
    if (document.documentElement.classList.contains("splash-skip")) {
      setState("gone");
      return;
    }
    const started = performance.now();
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const leave = () => {
      const wait = Math.max(0, MIN_MS - (performance.now() - started));
      t1 = setTimeout(() => {
        setState("leaving");
        t2 = setTimeout(() => {
          setState("gone");
          try {
            sessionStorage.setItem("db_splash", "1");
          } catch {
            /* storage unavailable — splash simply shows again next visit */
          }
        }, FADE_MS);
      }, wait);
    };
    if (document.readyState === "complete") leave();
    else window.addEventListener("load", leave, { once: true });
    return () => {
      window.removeEventListener("load", leave);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (state === "gone") return null;
  return (
    <div className={`splash${state === "leaving" ? " is-leaving" : ""}`} role="presentation" aria-hidden="true">
      <div className="splash-glow" />
      <div className="splash-stack">
        <div className="splash-emblem">
          <svg className="splash-ring" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="48" pathLength="1" />
          </svg>
          <div className="splash-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-512.png" alt="" width={512} height={512} className="splash-logo" decoding="async" />
            <span className="splash-shine" />
          </div>
        </div>
        <div className="splash-name">Divya Bharat</div>
        <div className="splash-rule" />
        <div className="splash-tag">Pure Indian kitchen staples</div>
      </div>
    </div>
  );
}
