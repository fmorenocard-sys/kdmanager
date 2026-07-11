import { test, expect } from '@playwright/test';

test.describe('Internationalization (i18n) - TC-016', () => {
    test.beforeEach(async ({ page }) => {
        // Force English locale before the app loads, bypassing browser language detection
        await page.addInitScript(() => {
            localStorage.setItem('i18nextLng', 'en');
        });
        await page.goto('/');
        // Wait for the app to be fully loaded in English
        await expect(page.getByText(/Total Power/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('should switch UI language to Spanish correctly', async ({ page }) => {
        // Find the language switcher button using data-testid
        const languageSwitcher = page.getByTestId('language-switcher-button');
        await expect(languageSwitcher).toBeVisible();

        // Verify English baseline is active
        await expect(page.getByText(/Total Power/i).first()).toBeVisible();

        // Click to open language dropdown
        await languageSwitcher.click();

        // Select Spanish ('Español') by its visible text
        const spanishOption = page.getByRole('button', { name: /Español/i });
        await expect(spanishOption).toBeVisible();
        await spanishOption.click();

        // Wait for UI to re-render with Spanish translations
        await page.waitForFunction(() => {
            return document.documentElement.lang === 'es' ||
                document.body.innerText.includes('Poder total');
        }, { timeout: 5000 }).catch(() => page.waitForTimeout(1500));

        // Verify Spanish translation is now active
        // "Total Power" → "Poder total" in Spanish (es/translation.json: dashboard.power)
        await expect(page.getByText('Poder total', { exact: false }).first()).toBeVisible({ timeout: 5000 });
    });
});
