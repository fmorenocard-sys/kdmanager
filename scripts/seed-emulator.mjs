/**
 * BUG-008 — Seed de l'émulateur Firebase avec des fixtures, pour VISUALISER et
 * TESTER les écrans CONNECTÉS de l'app (/me, /pilotage…) sans login réel (OAuth).
 *
 * Usage (émulateur firestore+auth déjà démarré) :
 *   node scripts/seed-emulator.mjs
 * Puis : `npm run test:serve` et ouvrir  http://localhost:5174/?testToken=<TOKEN>#/me
 * (le TOKEN est imprimé ici et écrit dans tests/.testlogin.json).
 *
 * L'Admin SDK contourne les règles Firestore (accès complet), donc le seed écrit
 * librement. La base ciblée est « kdmanagerdb » (comme l'app pour 2997).
 */
import { writeFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8082';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

const PROJECT = process.env.GCLOUD_PROJECT || 'kd-97-manager';
const DB_NAME = process.env.SEED_DB || 'kdmanagerdb';
// Scénario de fixtures (DA / états) :
//   declared   (défaut) : 2 comptes (war+filler), tous déclarés
//   undeclared           : 2 comptes, aucun déclaré (carte action multi-compte)
//   single               : 1 compte war, non déclaré (carte ambre « héros »)
const SCENARIO = process.env.SEED_SCENARIO || 'declared';

const app = initializeApp({ projectId: PROJECT });
const db = getFirestore(app, DB_NAME);
const auth = getAuth(app);

// ── Scénario « Roi Helios » (2 comptes : 1 war + 1 filler) ────────────────────
const UID = 'test-king-2997';
const WAR = { gid: '2463403', name: 'Helios' };
const FIL = { gid: '169461237', name: 'Aurion' };
const KVK_ID = 'kvk_test_soc5';

// Campagne COURANTE : active + déjà scannée (objectif/stats visibles). Ses chiffres
// DIFFÈRENT de l'archive → le garde de cohérence considère le scan « courant ».
const liveKvk = [{ id: WAR.gid, name: WAR.name, initialPower: 82_400_000, finalPower: 88_100_000, initialKp: 120_000_000, finalKp: 159_400_000, totalKpGained: 39_400_000, totalDead: 96_000 }];
const liveFiller = [{ id: FIL.gid, name: FIL.name, initialPower: 21_000_000, finalPower: 20_400_000, kp: 5_000_000, t4Dead: 120_000, t5Dead: 60_000, totalDead: 180_000 }];

// Campagne PASSÉE archivée (SoC 4) : chiffres FIGÉS, différents.
const pastKvk = [{ id: WAR.gid, name: WAR.name, initialPower: 78_000_000, finalPower: 84_000_000, totalKpGained: 96_000_000, totalDead: 251_000, goalPercent: 112, rate: 'Excellent' }];
const pastFiller = [{ id: FIL.gid, name: FIL.name, initialPower: 19_500_000, t4Dead: 200_000, t5Dead: 110_000, totalDead: 310_000 }];

const players = [
    { id: WAR.gid, name: WAR.name, power: 88_100_000, kp: 159_400_000, t5Kills: 1_200_000, deads: 96_000 },
    { id: FIL.gid, name: FIL.name, power: 20_400_000, kp: 5_000_000, t5Kills: 90_000, deads: 180_000 },
];

async function seed() {
    // Auth : (re)crée l'utilisateur de test.
    try { await auth.deleteUser(UID); } catch { /* n'existait pas */ }
    await auth.createUser({ uid: UID, email: 'test-king@example.com', displayName: 'Federico (test)', emailVerified: true });

    // Composition des comptes selon le scénario.
    const accountsList = SCENARIO === 'single'
        ? [{ governorId: WAR.gid, type: 'war', name: WAR.name }]
        : [
            { governorId: WAR.gid, type: 'war', name: WAR.name },
            { governorId: FIL.gid, type: 'filler', name: FIL.name },
        ];
    const declare = SCENARIO === 'declared';

    const batch = db.batch();
    batch.set(db.doc(`roles/${UID}`), { role: 'King' });
    batch.set(db.doc(`user_profiles/${UID}`), {
        governorId: WAR.gid,
        accounts: accountsList,
        updatedAt: new Date().toISOString(),
    });
    batch.set(db.doc('static_data/players'), { list: players, updatedAt: Timestamp.now() });
    batch.set(db.doc('static_data/kvk'), { list: liveKvk, updatedAt: Timestamp.now() });
    batch.set(db.doc('static_data/kvk_filler'), { list: liveFiller, updatedAt: Timestamp.now() });
    batch.set(db.doc('kvk_config/current'), {
        id: KVK_ID, name: 'SoC 5 - Storm of Stratagems',
        status: null, // active
        startDate: Timestamp.fromDate(new Date('2026-08-01T00:00:00Z')), // passée → campagne commencée
        endDate: Timestamp.fromDate(new Date('2026-10-17T00:00:00Z')),
        revealGoalStatus: true, // statut visible pour le test
        fillerDeathRatio: 0.5,
    });
    batch.set(db.doc('kvk_config/timeline'), {
        campaignId: KVK_ID,
        events: [
            { key: 'lk', label: 'LK Opening', at: '2026-08-28T00:00:00Z', category: 'milestone' },
            { key: 'pass4', label: 'Pass 4', at: '2026-09-10T02:00:00Z', category: 'pass' },
        ],
    });
    // Campagne archivée (pour le sélecteur de campagne)
    batch.set(db.doc('kvk_history/soc-4-king-of-all-britain-2026'), {
        title: 'SoC 4: King of All Britain (2026)', order: 4,
        list: pastKvk, fillerList: pastFiller,
        archivedAt: '2026-07-20T10:21:47.892Z',
    });
    // Déclarations : posées pour « declared », effacées sinon (repart propre — un
    // seed précédent ne doit pas laisser un compte « déclaré » par erreur).
    const warDecl = db.doc(`war_availabilities/${KVK_ID}_${UID}_${WAR.gid}`);
    const filDecl = db.doc(`war_availabilities/${KVK_ID}_${UID}_${FIL.gid}`);
    if (declare) {
        batch.set(warDecl, {
            governorId: WAR.gid, governorName: WAR.name, accountType: 'war',
            availability: 'Available', marches: [{ type: 'Cavalry' }, { type: 'Infantry' }, { type: 'Archer' }],
            userId: UID, kvkId: KVK_ID, kvkName: 'SoC 5 - Storm of Stratagems', updatedAt: Timestamp.now(),
        });
        batch.set(filDecl, {
            governorId: FIL.gid, governorName: FIL.name, accountType: 'filler',
            filler: { t4: 174_000, t5: 2_100_000 },
            userId: UID, kvkId: KVK_ID, kvkName: 'SoC 5 - Storm of Stratagems', updatedAt: Timestamp.now(),
        });
    } else {
        batch.delete(warDecl);
        batch.delete(filDecl);
    }
    await batch.commit();

    // Custom token pour se connecter côté app (émulateur : signature non vérifiée).
    const token = await auth.createCustomToken(UID);
    writeFileSync(new URL('../tests/.testlogin.json', import.meta.url), JSON.stringify({ uid: UID, token }, null, 2));
    console.log('SEED_OK db=%s uid=%s', DB_NAME, UID);
    console.log('TEST_TOKEN=%s', token);
    console.log('OPEN=http://localhost:5174/?testToken=' + encodeURIComponent(token) + '#/me');
}

seed().then(() => process.exit(0)).catch((e) => { console.error('SEED_FAIL', e); process.exit(1); });
