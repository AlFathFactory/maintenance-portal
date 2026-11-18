import { expect, test } from '@playwright/test';

test('anonymous visitors cannot open protected HSE or Maintenance routes', async ({ page }) => {
  for (const route of ['#/hse', '#/hse/approvals', '#/dashboard']) {
    await page.goto(`/${route}`);
    await expect(page).toHaveURL(/#\/access-denied$/);
    await expect(page.locator('main.access-page')).toBeVisible();
  }
});

test('invalid public QR route is available in Arabic and English', async ({ page }) => {
  await page.goto('/#/qr/invalid');
  await expect(page.locator('.public-qr-state h1')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('button', { name: 'EN' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('.public-qr-state h1')).toBeVisible();
});

for (const width of [375, 768, 1366]) {
  test(`public access pages fit ${width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/hse');
    await expect(page.locator('main.access-page')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.goto('/#/qr/invalid');
    await expect(page.locator('.public-qr-state')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}

test('unsaved inspection guard blocks link and browser history navigation', async ({ page }) => {
  await page.goto('/tests/browser/fixtures/navigation.html#/next');
  await page.getByRole('link', { name: 'Edit inspection' }).click();
  await page.getByRole('textbox', { name: 'Answer' }).fill('Faulty');

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Next page' }).click();
  await expect(page.getByRole('textbox', { name: 'Answer' })).toHaveValue('Faulty');

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'Answer' })).toHaveValue('Faulty');

  let accepted: Promise<void> | undefined;
  page.once('dialog', (dialog) => {
    accepted = dialog.accept();
  });
  await page.getByRole('link', { name: 'Next page' }).click();
  await accepted;
  await expect(page).toHaveURL(/#\/next$/);
  await expect(page.getByRole('link', { name: 'Edit inspection' })).toBeVisible();
});
