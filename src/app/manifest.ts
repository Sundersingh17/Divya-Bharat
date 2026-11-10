import type { MetadataRoute } from "next";

// Web app manifest — lets the site be installed to the home screen (PWA).
// Deliberately no service worker: this is an installable shell, not an
// offline app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Divya Bharat",
    short_name: "Divya",
    description: "Cold-pressed oils, chhatua, dal, spices and more — made in Odisha.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F2E9",
    theme_color: "#B6503B",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
