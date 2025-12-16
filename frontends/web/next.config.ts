import type { NextConfig } from "next";

const isMobileExport = process.env.NEXT_EXPORT === "true";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable static export when requested (used by mobile:export script).
  output: isMobileExport ? "export" : undefined,
};

export default nextConfig;
