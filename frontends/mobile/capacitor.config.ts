import type { CapacitorConfig } from "@capacitor/cli";
import path from "path";

// Default to offline/standalone. Opt into a dev server only when explicitly set.
const devServerUrl = process.env.CAPACITOR_SERVER_URL;
const serverConfig = devServerUrl
  ? {
      url: devServerUrl,
      cleartext: true,
    }
  : undefined;

// webDir points to a static export of the web app. For dev, we rely on server.url.
// For production bundles, run `npm run mobile:export` to populate frontends/mobile/web.
const config: CapacitorConfig = {
  appId: "com.nico.minesweeper",
  appName: "Minesweeper",
  webDir: "web",
  ...(serverConfig ? { server: serverConfig } : {}),
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
