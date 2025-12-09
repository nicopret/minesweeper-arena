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
      provider: "istanbul",
      reporter: ["text", "lcov"],
      exclude: ["src/app/page.tsx"],
    },
    // Allow swapping pools via env to manage memory (default threads)
    pool: process.env.VITEST_POOL ?? "threads",
    poolOptions: {
      threads: {
        singleThread: true,
        maxThreads: 1,
        maxHeap: 6144,
      },
      forks: {
        singleFork: true,
      },
    },
    sequence: {
      concurrent: false,
      shuffle: false,
      maxConcurrency: 1,
    },
  },
});
