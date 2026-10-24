// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* `tests/` abrite AUSSI des tests `node:test` (`*.test.mjs` : règles Firestore,
     schémas, parité). Le `testMatch` par défaut de Playwright attrape `*.test.*`
     autant que `*.spec.*` : il importait donc `firestore-rules.test.mjs`, dont les
     appels `node:test` de premier niveau s'exécutent À L'IMPORT. Résultat mesuré :
     zéro cas Playwright enregistré, mais la suite de règles rejouée en silence au
     milieu du run, sur le MÊME émulateur que les specs — sa sortie mêlée à celle de
     Playwright, et ses refus volontaires (cas « ATTAQUE ») pris pour des erreurs de
     l'app. On ne ramasse donc que les `*.spec.js`. */
  testMatch: '**/*.spec.js',
  /* 60 s plutôt que les 30 s par défaut. La PREMIÈRE navigation d'un run paie la
     compilation à froid de Vite (optimisation des dépendances + transformation à
     la demande), et les 3 navigateurs démarrent ensemble. Ça tenait par accident
     jusqu'ici : Playwright importait `firestore-rules.test.mjs`, dont la suite
     `node:test` s'exécutait pendant la collecte et offrait ~20 s de chauffe au
     serveur. En la retirant (cf. `testMatch`), le démarrage à froid est redevenu
     visible — 4 à 6 échecs par run, tous sur la première page chargée. Le délai
     n'était pas de la marge, c'était un masque. */
  timeout: 60_000,
  /* Sème l'émulateur (fixtures + jeton de connexion de test) avant toute spec :
     sans ça les écrans CONNECTÉS ne sont pas testables. Cf. tests/global-setup.js. */
  globalSetup: './tests/global-setup.js',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:5174',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run test:serve',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});

