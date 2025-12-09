import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/setupTests.ts',
    // Exclude Playwright e2e files from Vitest discovery
    exclude: ['tests/playwright/**', 'playwright.config.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
