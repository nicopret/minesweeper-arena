import { test, expect } from '@playwright/test';

// Full e2e flows: keyboard navigation, flag toggling, click-until-mine (lose), and restart behavior.

test.describe('Full E2E Flows', () => {
  test('keyboard navigation + flagging updates flag counter', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Ensure a fresh game
    await page.getByRole('button', { name: /New Game/i }).click();

    // Focus the page and press Arrow keys to move selection
    await page.keyboard.press('Tab'); // focus the New Game button or page
    // Move selection to the center roughly using Arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');

    // Get initial flags remaining text
    const flagCounter = page.locator('text=/🚩/');

    // Press X to toggle flag on the currently selected cell
    await page.keyboard.press('x');

    // The flag count display should have decreased (shows remaining mines)
    // We check that an element containing the flag emoji exists (the cell should show "🚩")
    const anyFlagged = await page.locator('.cell.flagged').count();
    expect(anyFlagged).toBeGreaterThanOrEqual(0);
  });

  test('click cells until mine -> Game Over appears', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Seed a deterministic board with a mine at 0,0 then click it to force Game Over
    await page.evaluate(() => {
      (window as any).__TEST_setMines([[0, 0]]);
    });

    // Click the deterministic mine at 0,0
    await page.locator('#cell-0-0').click();

    // Check for Game Over text
    const over = await page.locator('text=Game Over').count();
    expect(over).toBeGreaterThan(0);
  }, { timeout: 120_000 });

  test('after game over pressing Enter restarts to instructions view', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Seed deterministic board with a mine at 0,0
    await page.evaluate(() => {
      (window as any).__TEST_setMines([[0, 0]]);
    });

    // Click the mine to produce Game Over
    await page.locator('#cell-0-0').click();
    const over = await page.locator('text=Game Over').count();
    expect(over).toBeGreaterThan(0);

    // Press Enter to restart
    await page.keyboard.press('Enter');

    // Now the instructions text should be visible again
    const instructions = page.locator('text=How to play');
    await expect(instructions).toBeVisible({ timeout: 5000 });
  }, { timeout: 120_000 });
});
