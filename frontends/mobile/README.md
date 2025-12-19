# Minesweeper Mobile (Capacitor)

This wraps the existing web app in a Capacitor shell. By default it loads the local dev server (http://localhost:4000) so you can reuse the Nx `serve web` workflow.

## Development

```bash
# In one terminal, start the web dev server (desktop/mobile share port 4000)
npm run dev

# In another terminal, sync platform projects and run
npm run mobile:sync           # generates/updates android/ios under frontends/mobile
npm run mobile:open:android   # open Android Studio
npm run mobile:open:ios       # open Xcode (on macOS)
```

Set `CAPACITOR_SERVER_URL` to point the shell at a different URL if needed.

## Google login (native)

Google sign-in is implemented via a Capacitor native plugin (recommended for Android/iOS). This avoids issues with web-only Google Identity Services inside a WebView.

### 1) Create OAuth clients

In Google Cloud Console:

- Create a **Web** OAuth client id (used by the web app and as the “server client id” for native flows)
- Create an **Android** OAuth client id:
  - Package name: `com.nico.minesweeper`
  - SHA-1: from `./gradlew signingReport` (debug + release)

### 2) Install plugin and sync

From repo root:

```bash
npm run mobile:sync
```

### 3) Configure env vars for the UI

The web UI reads the web client id from `frontends/web/.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID="YOUR_WEB_OAUTH_CLIENT_ID.apps.googleusercontent.com"
```

Then rebuild the mobile bundle:

```bash
npm run mobile:export
npm run mobile:sync
```

## Packaging (static assets)

If you prefer bundling static assets instead of pointing at a dev server, export the web app and copy it into `frontends/mobile/web`:

```bash
npm run mobile:export
npm run mobile:sync
```

Then build/run from Android Studio / Xcode as usual.
