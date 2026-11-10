/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
];

const nextConfig = {
  reactStrictMode: true,
  // pdfkit reads its standard-font metrics (Helvetica.afm, etc.) from
  // files relative to its own package folder at runtime. If webpack
  // bundles it into a vendor chunk (Next's default for route handlers),
  // those relative paths point at .next/server/vendor-chunks instead of
  // the real node_modules/pdfkit — and the files aren't there, so the
  // invoice route throws ENOENT. Marking it external tells Next to
  // `require("pdfkit")` from node_modules at runtime instead of bundling
  // it, so its own path resolution works as intended.
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

module.exports = nextConfig;
