import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "src/setupTests.ts",
    // Only pick up our unit/integration tests, never anything in node_modules
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "tests/playwright/**",
      "playwright.config.ts",
    ],
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
