import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const webRoot = resolve(__dirname, "frontends/web");

export default defineConfig({
  root: webRoot,
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
    // Only pick up our unit/integration tests, never anything in node_modules
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "../../tests/playwright/**",
      "../../playwright.config.ts",
    ],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov"],
    },
    // Allow swapping pools via env to manage memory (default threads)
    pool: process.env.VITEST_POOL ?? "threads",
    sequence: {
      concurrent: false,
      shuffle: false,
    },
  },
});
