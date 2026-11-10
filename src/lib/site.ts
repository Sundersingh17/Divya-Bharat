// Single source of truth for the public site URL. Set NEXT_PUBLIC_SITE_URL
// in the environment to the real production domain. The fallback below is a
// deliberate placeholder (never a guessed domain) so local builds still work.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/+$/, "");
export const SITE_URL_IS_PLACEHOLDER = !process.env.NEXT_PUBLIC_SITE_URL;
