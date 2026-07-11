import { test, expect } from '@playwright/test';

test.describe('Routing & Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should navigate to Bank page', async ({ page }) => {
        await page.getByRole('link', { name: /Bank/i }).first().click();
        await expect(page).toHaveURL(/.*\/bank/);
        // Page title in translations is 'Kingdom Treasury' but sidebar is 'Bank'
        await expect(page.locator('h1')).toContainText(/Treasury|Bank/i);
    });

    test('should navigate to Deadweight page', async ({ page }) => {
        await page.getByRole('link', { name: /Deadweight/i }).first().click();
        await expect(page).toHaveURL(/.*\/deadweight/);
        await expect(page.locator('h1')).toContainText(/Deadweight/i);
    });

    test('should navigate to Trophies page - TC-014', async ({ page }) => {
        await page.getByRole('link', { name: /Trophies/i }).first().click();
        await expect(page).toHaveURL(/.*\/trophies/);
        // "Kingdom Trophies" is the title in the UI
        await expect(page.locator('h1')).toContainText(/Kingdom Trophies/i);
    });
});
