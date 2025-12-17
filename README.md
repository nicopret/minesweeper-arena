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

### Shared environment variables

This repo uses `score-server/.env` as the shared environment file for both the API server and the frontends.
The root npm scripts (`npm run dev`, `npm run build`, `npm run start`, etc.) preload that file via `scripts/with-score-env.cjs`,
so you generally do not need separate frontend `.env` files.

## Deploying the Score Server to Heroku

The Heroku deployment in this repo is wired to deploy **only** the API server under `score-server`, while pushing from the **repo root**.

### Prerequisites

- Install the Heroku CLI
- Have access to the Heroku app (example: `minesweeper-arena`)

### 1) Log in and attach the Heroku git remote (from repo root)

```bash
heroku login
heroku git:remote -a minesweeper-arena
```

### 2) Add Postgres and confirm `DATABASE_URL`

```bash
heroku addons:create heroku-postgresql -a minesweeper-arena
heroku config:get DATABASE_URL -a minesweeper-arena
```

Heroku Postgres automatically provides `DATABASE_URL`.

### 3) Set required config vars

At minimum you must set `JWT_SECRET`. Provider values are required only if you enable those login methods.

```bash
heroku config:set JWT_SECRET="<generated-long-random-string>" -a minesweeper-arena
heroku config:set GOOGLE_CLIENT_ID="<google client id>" -a minesweeper-arena
heroku config:set FACEBOOK_APP_ID="<facebook app id>" -a minesweeper-arena
heroku config:set FACEBOOK_APP_SECRET="<facebook app secret>" -a minesweeper-arena
```

Optional:

```bash
heroku config:set DATABASE_SSL=true JWT_EXPIRES_IN=7d -a minesweeper-arena
```

### 4) Deploy

```bash
git push heroku main
```

### How the deploy is wired

- `Procfile` runs the API server via `web: npm start --prefix score-server`
- `Procfile` runs migrations on release via `release: npm run server:deploy-schema`
- Root `heroku-postbuild` installs API dependencies under `score-server`

### Troubleshooting

- Stream logs: `heroku logs --tail -a minesweeper-arena`
- Verify access: `heroku apps:info -a minesweeper-arena`

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

## Desktop (Electron)

Run the desktop client (reuses the web UI via the local Next dev server):

```bash
npm run desktop:dev
```

The script starts `nx serve web` on port 4000 (if not already running) and opens an Electron window pointed at it. Override `NEXT_PORT`/`NEXT_HOST`/`NEXT_URL` to point the desktop shell at a different server.

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs on Node 20, installs deps via `npm ci`, executes Vitest, then Playwright (GitHub reporter). Use `npm run test` locally to mirror the unit step, or `npm run test:full` to exercise both suites before pushing.
