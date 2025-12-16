import type { CapacitorConfig } from "@capacitor/cli";
import path from "path";

// Default to the local dev server the desktop app already uses.
const devServerUrl =
  process.env.CAPACITOR_SERVER_URL || "http://localhost:4000";

// webDir points to a static export of the web app. For dev, we rely on server.url.
// For production bundles, run `npm run mobile:export` to populate frontends/mobile/web.
const config: CapacitorConfig = {
  appId: "com.nico.minesweeper",
  appName: "Minesweeper",
  webDir: "web",
  server: {
    url: devServerUrl,
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
