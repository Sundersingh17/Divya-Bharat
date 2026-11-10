import type { Config } from "tailwindcss";

// Divya Bharat design tokens (warm ivory / terracotta / olive / antique gold,
// Cormorant Garamond + Manrope). Previously "Heritage Market 2.0". Existing token names (red, cream,
// ink, gold, sage, card, line) are kept so untouched pages (checkout,
// account, admin) inherit the new palette automatically; new tokens
// (leaf, sand, warm, turmeric) power the homepage's multi-tone sections.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        red: "#B6503B", // brand terracotta
        "red-dark": "#8F3B2B", // dark terracotta
        cream: "#F7F2E9", // warm ivory — primary background
        "cream-2": "#EFE7D8", // second paper tone
        sand: "#E8DED1", // deeper section tone
        ink: "#29231F",
        "ink-soft": "#6A635B", // warm grey, darkened from #777068 to hold 4.5:1 on ivory
        gold: "#B49A6A", // antique gold
        turmeric: "#B49A6A",
        "gold-soft": "#DCCBA4",
        sage: "#69724F", // muted olive,
        leaf: "#304936", // deep leaf green
        "leaf-2": "#3D5A44",
        card: "#FFFDF8", // soft cream
        warm: "#FFFDF8",
        line: "#E8DED1" // warm beige
      },
      fontFamily: {
        serif: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"]
      },
      borderRadius: {
        DEFAULT: "8px"
      },
      boxShadow: {
        sm: "0 1px 2px rgba(33,29,24,.06), 0 1px 1px rgba(33,29,24,.04)",
        md: "0 8px 24px rgba(33,29,24,.10), 0 2px 6px rgba(33,29,24,.06)",
        lg: "0 20px 48px rgba(33,29,24,.18), 0 4px 12px rgba(33,29,24,.08)",
        lift: "0 14px 32px -12px rgba(33,29,24,.28)"
      },
      letterSpacing: {
        eyebrow: ".16em"
      },
      // Motion system: fast = hover/press, base = UI, editorial = reveals
      transitionDuration: {
        fast: "150ms",
        base: "300ms",
        editorial: "700ms"
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(.22,.9,.35,1)"
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-320px 0" },
          "100%": { backgroundPosition: "320px 0" }
        },
        bump: {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.35)" },
          "100%": { transform: "scale(1)" }
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "60%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" }
        },
        heartPop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.35)" },
          "100%": { transform: "scale(1)" }
        },
        overlayIn: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        pageIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        fadeSlideUp: "fadeSlideUp .4s cubic-bezier(.22,.9,.35,1) both",
        shimmer: "shimmer 1.3s linear infinite",
        bump: "bump .32s cubic-bezier(.22,.9,.35,1)",
        popIn: "popIn .45s cubic-bezier(.22,.9,.35,1) both",
        marquee: "marquee 38s linear infinite",
        heartPop: "heartPop .38s cubic-bezier(.22,.9,.35,1)",
        overlayIn: "overlayIn .22s cubic-bezier(.22,.9,.35,1) both",
        pageIn: "pageIn .22s cubic-bezier(.22,.9,.35,1) both"
      }
    }
  },
  plugins: []
};

export default config;
