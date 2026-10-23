/**
 * Connexion de test (BUG-008) — ouvrir une page sur un écran CONNECTÉ.
 *
 * `scripts/seed-emulator.mjs` mint un custom token pour l'utilisateur de fixtures
 * (`test-king-2997`, rôle Roi) et l'écrit dans `tests/.testlogin.json` (gitignoré).
 * `src/config/firebase.js` consomme `?testToken=` — mais UNIQUEMENT sous
 * `VITE_USE_FIREBASE_EMULATOR=true`, c'est-à-dire en `npm run test:serve`. Ce
 * contournement n'existe donc pas dans un build de production, et ce helper ne
 * doit jamais devenir une raison de relâcher cette garde.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';

const TOKEN_FILE = fileURLToPath(new URL('../.testlogin.json', import.meta.url));

/** Le custom token des fixtures. Jamais journalisé, jamais committé. */
export function testToken() {
    if (!existsSync(TOKEN_FILE)) {
        throw new Error(
            'tests/.testlogin.json absent — lance `npm run test:e2e` (son globalSetup sème '
            + 'l\'émulateur), ou `npm run emu:seed` à la main si l\'émulateur tourne déjà.'
        );
    }
    const { token } = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
    if (!token) throw new Error('tests/.testlogin.json ne porte pas de jeton — relance le seed.');
    return token;
}

/**
 * Ouvre `hashRoute` CONNECTÉ, et n'en revient qu'une fois l'écran connecté rendu.
 *
 * Deux pièges, tous deux déjà payés :
 *  - **HashRouter** : `?testToken=` doit rester AVANT le `#`. Placé après, il
 *    atterrit dans la query de la route et `window.location.search` reste vide —
 *    la connexion ne part jamais.
 *  - **la connexion est ASYNCHRONE** : `signInWithCustomToken` part au premier
 *    rendu, donc le premier écran est celui d'un Invité. Attendre la fin de la
 *    navigation ne prouve rien ; on attend un sélecteur que seul l'écran CONNECTÉ
 *    rend, d'où `ready` obligatoire.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} hashRoute route applicative, ex. `/fiche?gov=123`
 * @param {{ready: string, timeout?: number}} opts `ready` : sélecteur propre à l'écran connecté
 */
export async function gotoAuthenticated(page, hashRoute, { ready, timeout = 30_000 } = {}) {
    if (!ready) throw new Error('gotoAuthenticated : `ready` est obligatoire — nomme un sélecteur que seul l\'écran connecté rend.');
    await page.goto(`/?testToken=${encodeURIComponent(testToken())}#${hashRoute}`);
    await expect(page.locator(ready).first()).toBeVisible({ timeout });
}
