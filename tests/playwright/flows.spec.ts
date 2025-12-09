import { test, expect, Page } from "@playwright/test";

// Helpers --------------------------------------------------------------------

const flagCounter = (page: Page) => page.locator(".d-flex .bg-light").nth(1);

const getFlagsRemaining = async (page: Page): Promise<number> => {
  const text = await flagCounter(page).innerText();
  const match = text.match(/\d+/);
  if (!match) throw new Error("Could not read flag counter");
  return parseInt(match[0], 10);
};

const moveSelectionToTopLeft = async (page: Page) => {
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowUp");
  for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowLeft");
};

const selectUnrevealedTopRowCell = async (page: Page) => {
  const columns = await page.evaluate(
    () => document.querySelectorAll('[id^="cell-0-"]').length || 0,
  );
  if (columns === 0) throw new Error("Board not ready");

  await moveSelectionToTopLeft(page);

  for (let col = 0; col < columns; col++) {
    const isRevealed = await page
      .locator(`#cell-0-${col}`)
      .evaluate((el) => el?.classList.contains("revealed"));
    if (!isRevealed) return;
    await page.keyboard.press("ArrowRight");
  }

  throw new Error("No unrevealed cell found to flag");
};

const seedBoardIfHookAvailable = async (
  page: Page,
  mines: Array<[number, number]>,
): Promise<boolean> => {
  return await page.evaluate((seed) => {
    type TestWindow = typeof window & {
      __TEST_setMines?: (m: Array<[number, number]>) => void;
    };
    const hook = (window as TestWindow).__TEST_setMines;
    if (typeof hook === "function") {
      hook(seed);
      return true;
    }
    return false;
  }, mines);
};

const clickUntilGameOver = async (page: Page) => {
  const unrevealed = page.locator(".board-container .cell:not(.revealed)");
  for (let i = 0; i < 500; i++) {
    const remaining = await unrevealed.count();
    if (remaining === 0) break;

    await unrevealed.first().click();
    if (await page.locator("text=Game Over").isVisible()) return;
  }
  throw new Error("Could not trigger Game Over by clicking cells");
};

const triggerGameOver = async (page: Page) => {
  const seeded = await seedBoardIfHookAvailable(page, [[0, 0]]);
  if (seeded) {
    await page.locator("#cell-0-0").click();
  } else {
    await clickUntilGameOver(page);
  }
  await expect(page.locator("text=Game Over")).toBeVisible();
};

// Full e2e flows: keyboard navigation, flag toggling, click-until-mine (lose), and restart behavior.
test.describe.configure({ timeout: 120_000 });

test.describe("Full E2E Flows", () => {
  test("keyboard navigation + flagging updates flag counter", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /New Game/i }).click();
    await page.waitForSelector(".board-container .cell");

    await selectUnrevealedTopRowCell(page);

    const before = await getFlagsRemaining(page);
    await page.keyboard.press("x");
    const after = await getFlagsRemaining(page);

    expect(after).toBe(before - 1);
    await expect(page.locator(".cell.flagged")).toHaveCount(1);
  });

  test("click cells until mine -> Game Over appears", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await triggerGameOver(page);
  });

  test("after game over pressing Enter restarts to instructions view", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await triggerGameOver(page);
    await page.keyboard.press("Enter");

    const instructions = page.locator("text=How to play");
    await expect(instructions).toBeVisible({ timeout: 5000 });
  });
});
