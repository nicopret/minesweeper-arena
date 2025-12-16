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

## Packaging (static assets)

If you prefer bundling static assets instead of pointing at a dev server, export the web app and copy it into `frontends/mobile/web`:

```bash
npm run mobile:export
npm run mobile:sync
```

Then build/run from Android Studio / Xcode as usual.
