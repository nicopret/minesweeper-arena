import type { NextConfig } from "next";

const isStorybook = process.env.STORYBOOK === "true";

const nextConfig: NextConfig = {
  /* config options here */
  // React Compiler currently breaks Storybook's webpack pipeline, so turn it off there.
  reactCompiler: isStorybook ? false : true,
};

export default nextConfig;
