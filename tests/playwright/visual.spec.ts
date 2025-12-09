import { test, expect } from "@playwright/test";

test.describe("Visual E2E", () => {
  test("board visible and new game screenshot", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Seed deterministic board if hook exists so the screenshot is stable
    await page.evaluate(() => {
      type TestWindow = typeof window & {
        __TEST_setMines?: (m: Array<[number, number]>) => void;
      };
      const hook = (window as TestWindow).__TEST_setMines;
      if (typeof hook === "function")
        hook([
          [1, 1],
          [2, 3],
          [4, 4],
        ]);
    });

    // Ensure game is initialized by clicking New Game
    const newGame = page.getByRole("button", { name: /New Game/i });
    await newGame.click();

    const board = page.locator(".board-container");
    await expect(board).toBeVisible({ timeout: 10_000 });

    const screenshotPath = testInfo.outputPath("board.png");
    await board.screenshot({ path: screenshotPath });

    // Basic assertion to ensure board has cells
    const cellCount = await page.locator(".board-container .cell").count();
    expect(cellCount).toBeGreaterThan(0);
  });

  test("switch to medium and screenshot", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Click Medium difficulty then seed and New Game for deterministic medium board
    await page.getByRole("button", { name: /Medium \(16x16\)/i }).click();
    await page.evaluate(() => {
      type TestWindow = typeof window & {
        __TEST_setMines?: (m: Array<[number, number]>) => void;
      };
      const hook = (window as TestWindow).__TEST_setMines;
      if (typeof hook === "function")
        hook([
          [0, 0],
          [0, 1],
          [1, 0],
          [2, 2],
        ]);
    });
    await page.getByRole("button", { name: /New Game/i }).click();

    const board = page.locator(".board-container");
    await expect(board).toBeVisible({ timeout: 10_000 });

    const screenshotPath = testInfo.outputPath("board-medium.png");
    await board.screenshot({ path: screenshotPath });

    const cellCount = await page.locator(".board-container .cell").count();
    expect(cellCount).toBeGreaterThan(0);
  });
});
