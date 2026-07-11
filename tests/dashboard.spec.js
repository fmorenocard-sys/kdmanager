import { test, expect } from '@playwright/test';

test.describe('Dashboard Smoke Test', () => {
    test('should load the dashboard and check main elements', async ({ page }) => {
        // Assuming the app runs on localhost:5173
        await page.goto('/');

        // Wait for the main heading or a specific element to be visible
        // Based on the React architecture, the default page is the Dashboard
        const totalPowerTitle = page.getByText('Total Power', { exact: true }).first();

        // Check if the Total Power title is visible
        await expect(totalPowerTitle).toBeVisible();

        // Check if the Top Players table is present
        const topPlayersTable = page.getByRole('table').first();
        await expect(topPlayersTable).toBeVisible();
    });
});
