import { test, expect } from '@playwright/test';
import { gotoAuthenticated } from './helpers/login.js';

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
    // onglet du hub « Pilotage » (Command), qui est RÉSERVÉ AU LEADERSHIP
    // (`leadership: true` dans la nav). Ce test s'exécutait en Invité, qui n'a tout
    // simplement pas l'entrée : il échouait depuis la refonte de navigation, sans
    // que personne ne le voie puisque la suite n'était pas regardée. On y entre
    // maintenant CONNECTÉ, avec l'utilisateur de fixtures (Roi).
    test('should reach Deadweight via the Pilotage hub', async ({ page, browserName }) => {
        // Même réserve que `fiche.spec.js` : sous WebKit (build Playwright/Windows)
        // le flux Firestore ne repart pas après la connexion.
        test.skip(browserName === 'webkit', 'WebKit : flux Firestore muet après la connexion');
        // `a[href="#/pilotage"]` n'existe que pour le leadership : c'est à la fois
        // le marqueur d'écran connecté et ce que le test vient vérifier.
        await gotoAuthenticated(page, '/me', { ready: 'a[href="#/pilotage"]' });
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
