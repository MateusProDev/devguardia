import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DevGuard AI/);
});

test('scan button is visible', async ({ page }) => {
  await page.goto('/');
  const scanButton = page.getByText('Começar grátis');
  await expect(scanButton).toBeVisible();
});
