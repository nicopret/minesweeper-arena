import { test, expect } from '@playwright/test';

test('homepage returns 200 on available port (tries 3000 then 3001)', async ({ page }) => {
  const ports = [3000, 3001];
  let response = null as any;

  for (const port of ports) {
    try {
      response = await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' });
      if (response && response.status && response.status() < 400) {
        break;
      }
    } catch (e) {
      // try next port
    }
  }

  expect(response && response.status && response.status()).toBeLessThan(400);
});
