import { test, expect } from '@playwright/test';
import { gotoAuthenticated } from './helpers/login.js';

/**
 * `/fiche` (E-010 / F-039) — le premier parcours AUTHENTIFIÉ du harnais.
 *
 * Pourquoi cette spec existe : deux bugs ont été livrés les 22 et 23 octobre 2026
 * sur cet écran, et aucun filet ne les a vus. `npm run lint`, `npm run build`,
 * `npm run test:unit` et `tests/render-smoke` ne regardent jamais une page rendue
 * dans un vrai navigateur, et encore moins une page derrière l'authentification —
 * or `/fiche` est derrière l'authentification ET derrière un compte réclamé.
 *
 * Les deux cas ci-dessous sont des tests de RÉGRESSION au sens strict : chacun
 * tombe sur le code d'avant le correctif. C'est leur seul critère de valeur.
 */

// L'étape « Stocks » (bloc `economy` du schéma) est la 2e des 4 du stepper.
// 11 champs requis, aucun pré-remplissable sans déclaration de guerre.
const ECONOMY_STEP = 1;
const ECONOMY_TOTAL = 11;

/**
 * Chaque test édite la fiche d'un gouverneur qui n'est qu'à lui.
 *
 * La saisie est AUTOSAUVEGARDÉE dans `mentoring_sheets/{governorId}` 1,5 s après
 * la dernière frappe : deux tests qui partageraient un compte se verraient l'un
 * l'autre, et « l'étape Stocks part de 0/11 » cesserait d'être vrai. Les trois
 * projets de navigateurs tournent en plus en parallèle sur le même émulateur,
 * d'où le nom du projet dans la clé.
 *
 * L'utilisateur de fixtures est Roi, donc `canAccessSheet()` l'autorise sur
 * n'importe quel gouverneur (BR-027) : un compte de test n'a pas besoin d'exister
 * dans le roster.
 */
const govFor = (testInfo) => `e2e-${testInfo.project.name}-${testInfo.titlePath.at(-1)}`
    .replace(/[^\w-]+/g, '-').slice(0, 60);

/** Ouvre la fiche d'un compte vierge, sur l'étape « Stocks ». */
async function openEconomyStep(page, testInfo) {
    // `.v2-step` n'existe que dans `SheetForm`, qui n'est rendu ni pour un Invité
    // (« connexion requise ») ni pendant le chargement : c'est donc un marqueur
    // honnête d'« écran connecté rendu ».
    await gotoAuthenticated(page, `/fiche?gov=${govFor(testInfo)}`, { ready: '.v2-step' });
    const step = page.locator('.v2-step').nth(ECONOMY_STEP);
    // La fiche est neuve : l'étape Stocks part bien de zéro champ rempli.
    await expect(step).toHaveAttribute('aria-label', new RegExp(`\\b0\\s*/\\s*${ECONOMY_TOTAL}\\b`));
    await step.click();
    await expect(page.locator('#economy-food')).toBeVisible();
    return step;
}

test.describe('Fiche de compte — /fiche (connecté)', () => {
    // Un écran CONNECTÉ enchaîne plus d'étapes qu'un écran Invité : démarrage de
    // l'app, `signInWithCustomToken`, chargement du roster, puis de la fiche.
    test.describe.configure({ timeout: 60_000 });

    // WebKit est écarté des écrans CONNECTÉS, pas par confort : dans la build
    // WebKit de Playwright sous Windows, le flux Firestore ne repart pas après la
    // connexion — `[testLogin] connecté` est bien journalisé, puis `onSnapshot`
    // reste muet et la page ne quitte jamais « Loading Kingdom Data… ». Une fois
    // sur trois environ il passe : un test instable est pire qu'un test absent,
    // il apprend à ignorer le rouge. Les écrans Invités, eux, restent couverts
    // sur les trois moteurs. À vérifier sur un vrai Safari
    // avant d'en conclure quoi que ce soit — cf. docs/qa/Playwright_Setup.md.
    test.skip(({ browserName }) => browserName === 'webkit',
        'WebKit (build Playwright/Windows) : le flux Firestore ne reprend pas après la connexion');

    test('BUG-018 — un décimal reste saisissable frappe par frappe', async ({ page }, testInfo) => {
        await openEconomyStep(page, testInfo);

        const food = page.locator('#economy-food');
        await food.click();
        // FRAPPE PAR FRAPPE, délibérément : `fill()` pose la valeur en un seul
        // événement et NE REPRODUIT PAS le bug — il passerait au vert sur le code
        // cassé. Le champ est contrôlé ; sans brouillon de saisie il réaffiche la
        // valeur *parsée* à chaque frappe, donc « 5, » redevient « 5 » et le « 6 »
        // suivant donne « 56 ».
        await page.keyboard.type('5,6');
        await expect(food).toHaveValue('5,6');

        // En quittant le champ on repasse à la valeur STOCKÉE, normalisée : la
        // virgule française est comprise, elle n'est pas conservée telle quelle.
        await food.blur();
        await expect(food).toHaveValue('5.6');

        // Même histoire avec le point décimal : « 3. » ne doit pas être mangé.
        const wood = page.locator('#economy-wood');
        await wood.click();
        await page.keyboard.type('3.1');
        await expect(wood).toHaveValue('3.1');
        await wood.blur();
        await expect(wood).toHaveValue('3.1');
    });

    test('BUG-017 — la jauge du stepper se dessine et suit le ratio', async ({ page }, testInfo) => {
        const step = await openEconomyStep(page, testInfo);
        const track = step.locator('.v2-step-track');
        const fill = step.locator('.v2-step-fill');

        // La piste existe et a sa hauteur même à 0 % — c'est un élément de flex,
        // elle se bloquait seule. C'est le REMPLISSAGE qui ne se dessinait pas.
        const trackBox = await track.boundingBox();
        expect(trackBox.height).toBeGreaterThan(0);
        expect(trackBox.width).toBeGreaterThan(0);

        // 2 champs sur 11. `fill()` suffit ici : ce test mesure la jauge, pas la
        // saisie — c'est BUG-018 ci-dessus qui tape frappe par frappe.
        await page.locator('#economy-food').fill('5.6');
        await page.locator('#economy-wood').fill('3.1');
        await expect(step).toHaveAttribute('aria-label', new RegExp(`\\b2\\s*/\\s*${ECONOMY_TOTAL}\\b`));

        // LE bug : `.v2-step-fill` est un `<span>`, donc inline par défaut, et un
        // élément inline IGNORE `width`/`height`. Le style inline portait pourtant
        // le bon pourcentage — seule la MESURE du rendu l'attrape, c'est elle qui
        // a révélé la jauge invisible sur le canal staging.
        //
        // La longueur DIT l'avancement : 2/11, soit 18 % de la piste. C'est tout le
        // parti pris du stepper — pas une couleur par état, une longueur. On attend
        // que la transition CSS (width .25s) se pose : mesurer dès que la largeur
        // dépasse 0 attraperait le DÉBUT de l'animation, pas sa cible.
        const expectedRatio = 2 / ECONOMY_TOTAL;
        await expect.poll(
            async () => {
                const f = await fill.boundingBox();
                const tr = await track.boundingBox();
                return f && tr?.width ? f.width / tr.width : 0;
            },
            { timeout: 5_000, message: 'largeur de la jauge rapportée à celle de la piste' },
        ).toBeCloseTo(expectedRatio, 1); // ±0,05 : la jauge est posée en % entiers

        // Et la jauge occupe bien une SURFACE — c'est la mesure que `display: inline`
        // ramenait à zéro, sur les deux axes.
        const fillBox = await fill.boundingBox();
        expect(fillBox.width).toBeGreaterThan(0);
        expect(fillBox.height).toBeGreaterThan(0);
    });

    test('les boutons d\'étape tiennent la cible tactile de 44 px', async ({ page }, testInfo) => {
        await openEconomyStep(page, testInfo);

        // `.agent/rules/responsiveness.md` : cible tactile ≥ 44×44. Le contenu du
        // bouton n'en fait qu'environ 28 — c'est `min-height` qui fait le reste, et
        // rien ne le rappelle à qui retouche le stepper.
        const steps = await page.locator('.v2-step').all();
        expect(steps.length).toBe(4);
        for (const s of steps) {
            const box = await s.boundingBox();
            // Tolérance d'un demi-pixel : les trois moteurs n'arrondissent pas pareil.
            expect(box.height).toBeGreaterThanOrEqual(43.5);
        }
    });
});
