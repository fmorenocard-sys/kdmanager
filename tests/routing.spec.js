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

    // F-032 Lot 6 : Deadweight n'est plus une entrée de nav dédiée — c'est un
    // onglet du hub leadership « Pilotage » (Command). On y accède via Pilotage.
    test('should reach Deadweight via the Pilotage hub', async ({ page }) => {
        await page.getByRole('link', { name: /Command|Pilotage/i }).first().click();
        await expect(page).toHaveURL(/.*\/pilotage/);
        await page.getByRole('button', { name: /Deadweight/i }).click();
        await expect(page).toHaveURL(/tab=deadweight/);
    });

    test('should navigate to Trophies page - TC-014', async ({ page }) => {
        await page.getByRole('link', { name: /Trophies/i }).first().click();
        await expect(page).toHaveURL(/.*\/trophies/);
        // "Kingdom Trophies" is the title in the UI
        await expect(page.locator('h1')).toContainText(/Kingdom Trophies/i);
    });
});
