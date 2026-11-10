import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import WhatsAppButton from "@/components/WhatsAppButton";
import SplashScreen from "@/components/SplashScreen";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { UIProvider } from "@/context/UIContext";
import { SITE_URL } from "@/lib/site";

// Display: Cormorant Garamond echoes the logo's serif wordmark. Body/UI: Manrope.
// next/font self-hosts both with display: swap and size-adjusted fallbacks,
// so text does not shift when they load.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap"
});
const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap"
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono"
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F2E9"
};

export const metadata: Metadata = {
  applicationName: "Divya Bharat",
  appleWebApp: { capable: true, title: "Divya Bharat", statusBarStyle: "default" },
  title: {
    default: "Divya Bharat Food Processing Centre — Odisha Oils, Chhatua & More",
    template: "%s"
  },
  description:
    "Cold-pressed mustard, coconut, groundnut, sunflower and sesame oil, chhatua, dal, spices and more — traditionally processed in Odisha, delivered pan-India.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    siteName: "Divya Bharat Food Processing Centre",
    type: "website",
    locale: "en_IN"
  },
  twitter: {
    card: "summary_large_image"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${plexMono.variable}`}>
      <head>
        {/* Repeat visits in the same session skip the splash before first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(sessionStorage.getItem('db_splash'))document.documentElement.classList.add('splash-skip')}catch(e){}"
          }}
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
      </head>
      <body className="font-sans">
        <SplashScreen />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        {pixelId && (
          <Script id="meta-pixel-init" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
        <ToastProvider>
          <AuthProvider>
            <LanguageProvider>
              <CartProvider>
                <UIProvider>{children}</UIProvider>
              </CartProvider>
            </LanguageProvider>
          </AuthProvider>
        </ToastProvider>
        <WhatsAppButton />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
