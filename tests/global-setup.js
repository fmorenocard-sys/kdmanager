/**
 * globalSetup Playwright — sème l'émulateur AVANT les specs.
 *
 * `npm run test:e2e` lançait `firebase emulators:exec "playwright test"` sans rien
 * semer : l'émulateur était donc VIDE, aucune spec ne pouvait se connecter, et
 * toutes tournaient en Invité. Les deux bugs du 2026-10-23 (BUG-017 et BUG-018)
 * vivaient derrière l'authentification — aucun filet ne les voyait.
 *
 * Le seed est lancé en PROCESSUS SÉPARÉ, pas importé : `seed-emulator.mjs` finit
 * par `process.exit(0)`, qui tuerait Playwright au milieu de son démarrage.
 *
 * Posé ici plutôt que dans la commande d'`emulators:exec` : un `&&` dans cette
 * chaîne dépend du shell (cmd.exe / sh), et un échec du seed y passerait pour un
 * échec de tests. En globalSetup, il échoue avec sa propre cause.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TOKEN_FILE = fileURLToPath(new URL('./.testlogin.json', import.meta.url));
const SEED_SCRIPT = fileURLToPath(new URL('../scripts/seed-emulator.mjs', import.meta.url));

export default function globalSetup() {
    // Un jeton PÉRIMÉ est pire que pas de jeton : la connexion échouerait loin de
    // sa cause (écran Invité inexpliqué). On repart d'un fichier absent.
    if (existsSync(TOKEN_FILE)) rmSync(TOKEN_FILE);

    const res = spawnSync(process.execPath, [SEED_SCRIPT], { encoding: 'utf8' });

    if (res.status !== 0 || !existsSync(TOKEN_FILE)) {
        throw new Error([
            'Seed de l\'émulateur impossible — les specs authentifiées ne peuvent pas tourner.',
            'Vérifie que l\'émulateur Firestore (8082) + Auth (9099) est bien démarré :',
            '`npm run test:e2e` le fait via `firebase emulators:exec`.',
            '',
            (res.stderr || res.stdout || res.error?.message || '').trim(),
        ].join('\n'));
    }

    // Le jeton lui-même n'est JAMAIS journalisé : il est écrit dans
    // tests/.testlogin.json (gitignoré) et relu par tests/helpers/login.js.
    console.log('[globalSetup] fixtures semées, jeton de test dans tests/.testlogin.json');
}
