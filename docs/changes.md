# Changes: `src/app/page.tsx` (summary)

This document summarizes the key UI, UX and testability changes made to `src/app/page.tsx`.

- Keyboard navigation
  - Added keyboard support for arrow keys and numpad to move a selected cell.
  - `Space` reveals a cell, `X` flags/unflags a cell, and `Enter` restarts the game.

- Selection / UX
  - Added a visible "selected" cell highlight and maintained selection state across keyboard moves.
  - On new game start, the UI selects a random cell near the center to give players a meaningful starting focus.
  - When a new game starts, the UI simulates a click on the selected cell and will auto-reveal a nearby zero (flood fill) if found, improving first-run discovery.

- Responsive grid & cell sizing
  - Implemented responsive CSS and a `--cell-size` variable (computed in JS) so medium/hard boards scale correctly and allow proper scrolling.
  - Adjusted grid styles to use `box-sizing: border-box` and `grid-auto-rows` for consistent layout.

- First-click safety & mine placement
  - `placeMines` excludes a 3x3 area around the first click to ensure the first reveal is never a mine.
  - Mines are placed deterministically for tests via `buildBoardFromMines(mines)` (see testing notes below).

- Win detection and reveal behavior
  - Implemented "win by flagging" detection: when all bombs are flagged the game ends as a win and remaining unrevealed cells are revealed.
  - On win, all unrevealed cells are revealed to show the final board state.
  - Refactored win-check logic into `src/app/utils/gameUtils.ts` (pure functions) and updated callers in `page.tsx`.

- Deterministic testing hook
  - Added a test-only hook `window.__TEST_setMines(mines)` and `buildBoardFromMines` to allow deterministic Playwright flows and screenshots.
  - This hook is gated behind the `NEXT_PUBLIC_TEST_HOOK` environment variable to avoid enabling it in normal production builds.

- Tests & CI
  - Unit tests (Vitest) were added for `GameUtils` helpers.
  - Playwright e2e/visual tests were added and updated to use the deterministic seed hook when the env var is enabled.
  - A GitHub Actions workflow (`.github/workflows/ci.yml`) was added to run unit and Playwright tests on push/PR.

Notes / Safety

- The test hook is explicitly gated by `NEXT_PUBLIC_TEST_HOOK` — only set this to `1` for testing in local or CI environments.
- If you want the hook even more restricted (CI-only), we can update the runtime gating to check for CI-specific env vars.

If you'd like, I can also:

- Move additional pure logic into `GameUtils` for easier unit testing.
- Create a small developer guide describing how to run tests locally and in CI (including Playwright browser installation steps).

---

Generated: automated commit by assistant (branch will contain this file and any uncommitted changes to `src/app/page.tsx`).
