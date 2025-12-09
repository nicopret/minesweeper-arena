import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/playwright",
  timeout: 30_000,
  use: {
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  // Put snapshots next to tests
  snapshotDir: "tests/playwright/__snapshots__",
});
