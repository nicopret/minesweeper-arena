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

## Testing
- `npm run test` — Vitest unit/integration suite
- `npm run test:watch` — watch mode
- `npm run test:coverage` — coverage report
- `npm run test:e2e` — Playwright E2E tests (first run may need `npx playwright install --with-deps`)
- `npm run test:full` — run Vitest then Playwright

## CI
GitHub Actions workflow `.github/workflows/ci.yml` runs on Node 20, installs deps via `npm ci`, executes Vitest, then Playwright (GitHub reporter). Use `npm run test` locally to mirror the unit step, or `npm run test:full` to exercise both suites before pushing.
