# Minesweeper

[![CI](https://github.com/NicoPretorius/minesweeper-arena/actions/workflows/ci.yml/badge.svg)](https://github.com/NicoPretorius/minesweeper-arena/actions/workflows/ci.yml)

Classic Minesweeper built with Next.js 16, React 19, TypeScript, Vitest, and Playwright.

## Features

- Three difficulties (easy, medium, hard) with responsive board sizing
- First-click safety and mine counts per cell
- Flagging, timer, mine counter, and win/lose states
- Keyboard focus and accessibility-friendly controls
- E2E tests with Playwright and unit tests with Vitest

## How to Play

- Mouse: left click to reveal, right click to flag/unflag
- Keyboard: arrow keys to move, Space to reveal, X to flag/unflag
- Win by revealing all safe cells; flags help track where you think mines are

## Getting Started (local)

Prerequisites: Node 20+ and npm.

```bash
npm install
npm run dev
# open http://localhost:3000
```

App code now lives under `frontends/web`, managed by Nx.

### Nx workspace

The repo is managed by Nx (project name: `web`). Common commands:

- `npm run dev` (or `npx nx serve web`) to start the Next.js dev server
- `npm run build` (or `npx nx build web`) to create a production build
- `npm run start` to serve the production build
- `npx nx graph` to visualize the project graph

### Git Hooks (pre-commit lint/format)

```bash
npm install        # if you haven't yet
npm run prepare    # sets up Husky hooks
```

The pre-commit hook runs eslint (with fix) and Prettier on staged files via lint-staged.

## Testing

- `npm run test` — Vitest unit/integration suite (runs `nx test web`)
- `npm run test:watch` — watch mode
- `npm run test:coverage` — coverage report
- `npm run test:e2e` — Playwright E2E tests (first run may need `npx playwright install --with-deps`)
- `npm run test:full` — run Vitest then Playwright

## Scoreboard backend (Lambda + API Gateway + DynamoDB)

Files live in `scoreboard/`. Required env vars can be set in `scoreboard/.env`:

- `AWS_REGION` (e.g., `us-east-1`)
- `LAMBDA_ROLE_ARN` (IAM role ARN for the Lambda)
- `LAMBDA_FUNCTION_NAME` (default `user-identity`)
- `USER_IDENTITY_TABLE` (default `UserIdentity`)
- `API_NAME` (default `arena-scoreboard`)
- `API_STAGE` (default `prod`)
- Frontend env to call the API from the browser: set `NEXT_PUBLIC_SCOREBOARD_API_BASE_URL` (e.g., `https://<apiId>.execute-api.<region>.amazonaws.com/<stage>`)

### 1) Provision IAM role (once)

```bash
cd scoreboard
./provision-lambda-role.sh
# Note the output ARN and set LAMBDA_ROLE_ARN in scoreboard/.env
```

### 2) Create DynamoDB table (UserIdentity)

```bash
npm run dynamodb:create
```

### 3) Deploy the Lambda

```bash
npm run lambda:deploy
```

The deployment script bundles the function from `scoreboard/lambdas/user-identity/` (including dependencies) and uploads it.

### 4) Deploy the API Gateway

```bash
npm run api:deploy
```

This creates/updates an HTTP API named `arena-scoreboard` with `POST /user` wired to the Lambda. The script prints the invoke URL, e.g.:

```
https://<apiId>.execute-api.<region>.amazonaws.com/prod/user
```

### 5) Test the Lambda directly

```bash
npm run lambda:test -- --provider google --providerUserId 123
```

Shows a pretty-printed response with `userId`, `createdAt`, and `lastSeenAt`.

### 6) Test the API with Postman

Import `scoreboard/arena-scoreboard.postman_collection.json`, set `apiId`, `region`, and `stage` variables, then run the `POST /user` request with body:

```json
{
  "provider": "google",
  "providerUserId": "test-user-123"
}
```

## Google Login (frontend)

The web UI supports Google login. On the web it uses Google Identity Services (GIS). On the Capacitor Android app it uses a native Google Auth plugin.

1. Create a Google OAuth Client ID (Web application) in Google Cloud Console.
2. Add the client id to `frontends/web/.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
```

After restarting `npm run dev`, the “Sign in with Google” button shows at the top of the game card, and the UI displays `Hi, <firstName>` after a successful sign-in.

### Mobile (Capacitor) notes

Bundled static assets run inside a WebView with a non-standard origin (often `capacitor://localhost`), so web-based GIS sign-in is unreliable there. The mobile app uses a native sign-in flow instead; see `frontends/mobile/README.md` for setup.

## Desktop (Electron)

Run the desktop client (reuses the web UI via the local Next dev server):

```bash
npm run desktop:dev
```

The script starts `nx serve web` on port 4000 (if not already running) and opens an Electron window pointed at it. Override `NEXT_PORT`/`NEXT_HOST`/`NEXT_URL` to point the desktop shell at a different server.

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs on Node 20, installs deps via `npm ci`, executes Vitest, then Playwright (GitHub reporter). Use `npm run test` locally to mirror the unit step, or `npm run test:full` to exercise both suites before pushing.
