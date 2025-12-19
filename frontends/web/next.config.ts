import type { NextConfig } from "next";

const isMobileExport = process.env.NEXT_EXPORT === "true";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable static export when requested (used by mobile:export script).
  output: isMobileExport ? "export" : undefined,

  // PostHog rewrites
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
