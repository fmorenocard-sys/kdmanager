/**
 * backfill-war-governor-ids.cjs
 * Rattrapage du miroir plat `user_profiles/{uid}.warGovernorIds` — moitié (b) de
 * BUG-021.
 *
 * POURQUOI. Les règles autorisent l'écriture d'une fiche de mentorat via
 * `hasClaimed()`, qui lit `warGovernorIds` avec un défaut `[]` : l'absence du
 * champ se lit donc comme « n'a rien réclamé ». Ce miroir est né avec E-010
 * (BR-027) et n'est écrit que par `applyProfile`, au moment où l'utilisateur
 * réclame ou retire un compte. Tout profil réclamé AVANT E-010 en est dépourvu,
 * et son propriétaire se voyait refuser toute sauvegarde de fiche.
 *
 * Le correctif client (moitié a, livré le 2026-10-26) répare chaque profil à la
 * connexion de son propriétaire. Ce script fait le reste tout de suite, pour que
 * le suivi du Conseil soit juste sans attendre que chacun repasse.
 *
 * CE QU'IL ÉCRIT. Le seul champ `warGovernorIds`, et seulement sur les profils
 * où il diverge. Il ne touche ni `accounts`, ni `governorId`, ni `updatedAt` :
 * le rattrapage doit être invisible dans l'historique de l'utilisateur. Il
 * n'accorde aucun droit nouveau — il rend lisible par une règle une réclamation
 * qui existait déjà (même parti pris que A-023).
 *
 * LA RÈGLE DE CALCUL est celle d'`AuthContext.applyProfile`, volontairement
 * recopiée à l'identique :
 *   - `accounts[]` présent  -> les comptes dont le type n'est pas 'filler' ;
 *   - sinon (profil hérité) -> le seul `governorId`, traité comme compte de guerre,
 *     exactement comme la migration paresseuse d'`accounts[]` (A-024).
 *
 * ⚠️ Le PROJET est OBLIGATOIRE et l'écriture doit être demandée explicitement :
 * sans `--apply`, le script ne fait que LIRE et montrer ce qu'il changerait.
 *
 * Identifiants : ADC locales (`gcloud auth application-default login`), comme les
 * autres scripts d'ops. L'Admin SDK contourne les règles — d'où la simulation par
 * défaut.
 *
 * Usage :
 *   node scripts/backfill-war-governor-ids.cjs prod            # simulation
 *   node scripts/backfill-war-governor-ids.cjs prod --apply    # écriture réelle
 *   node scripts/backfill-war-governor-ids.cjs pilot --apply
 *
 * Sur l'émulateur (aucune ADC requise) :
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8082 node scripts/backfill-war-governor-ids.cjs prod --apply
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const ALIASES = {
    prod: 'kd-97-manager', default: 'kd-97-manager', '97': 'kd-97-manager', '2997': 'kd-97-manager',
    pilot: 'kd-41-manager', '41': 'kd-41-manager', '3341': 'kd-41-manager',
    arcelia: 'kd-2293-manager', '2293': 'kd-2293-manager',
    mimoso: 'kd-1362-manager', '1362': 'kd-1362-manager',
};

const arg = (process.argv[2] || '').trim();
const APPLY = process.argv.includes('--apply');
const DB_NAME = process.env.BACKFILL_DB || 'kdmanagerdb';

if (!arg) {
    console.error('❌ Projet requis. Usage : node scripts/backfill-war-governor-ids.cjs <prod|pilot|arcelia|mimoso|kd-xxx> [--apply]');
    console.error('   Sans --apply, le script simule : il lit, il compte, il n\'écrit rien.');
    process.exit(1);
}

const projectId = ALIASES[arg.toLowerCase()] || (arg.startsWith('kd-') ? arg : null);
if (!projectId) {
    console.error(`❌ Projet inconnu : « ${arg} ». Alias : ${Object.keys(ALIASES).join(', ')} — ou un id brut kd-...`);
    process.exit(1);
}

const onEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const app = initializeApp(
    onEmulator ? { projectId } : { credential: applicationDefault(), projectId },
);
const db = getFirestore(app, DB_NAME);

/** Le miroir attendu pour un profil — même règle qu'`AuthContext.applyProfile`. */
function expectedMirror(profile) {
    const accounts = Array.isArray(profile.accounts) && profile.accounts.length
        ? profile.accounts
        : (profile.governorId ? [{ governorId: profile.governorId, type: 'war' }] : []);
    return accounts
        .filter((a) => a && a.type !== 'filler' && a.governorId != null)
        .map((a) => String(a.governorId));
}

const sameSet = (a, b) => a.length === b.length
    && [...a].sort().join('|') === [...b].sort().join('|');

(async () => {
    console.log(`\n${APPLY ? '✍️  ÉCRITURE' : '👀 SIMULATION'} — projet ${projectId}, base « ${DB_NAME} »${onEmulator ? ' (ÉMULATEUR)' : ''}\n`);

    const snap = await db.collection('user_profiles').get();
    const stats = { lus: snap.size, aEcrire: 0, dejaBons: 0, sansCompte: 0 };
    const aEcrire = [];

    snap.forEach((docSnap) => {
        const p = docSnap.data() || {};
        const attendu = expectedMirror(p);
        if (!attendu.length) { stats.sansCompte += 1; return; }

        const actuel = Array.isArray(p.warGovernorIds) ? p.warGovernorIds.map(String) : null;
        if (actuel && sameSet(actuel, attendu)) { stats.dejaBons += 1; return; }

        stats.aEcrire += 1;
        aEcrire.push({ uid: docSnap.id, actuel: actuel ?? '(absent)', attendu });
    });

    // Détail borné : de quoi contrôler, pas de quoi noyer.
    aEcrire.slice(0, 20).forEach((r) => {
        console.log(`  ${r.uid}\n      actuel  : ${JSON.stringify(r.actuel)}\n      attendu : ${JSON.stringify(r.attendu)}`);
    });
    if (aEcrire.length > 20) console.log(`  … et ${aEcrire.length - 20} autre(s).`);

    if (APPLY && aEcrire.length) {
        // Par lots de 400 : la limite d'un batch Firestore est 500 écritures.
        for (let i = 0; i < aEcrire.length; i += 400) {
            const batch = db.batch();
            for (const r of aEcrire.slice(i, i + 400)) {
                batch.set(db.doc(`user_profiles/${r.uid}`), { warGovernorIds: r.attendu }, { merge: true });
            }
            await batch.commit();
            console.log(`  → lot écrit : ${Math.min(i + 400, aEcrire.length)}/${aEcrire.length}`);
        }
    }

    console.log(`\n  ${'profils lus'.padEnd(20)} : ${stats.lus}`);
    console.log(`  ${'déjà corrects'.padEnd(20)} : ${stats.dejaBons}`);
    console.log(`  ${'sans compte réclamé'.padEnd(20)} : ${stats.sansCompte} (ignorés — rien à refléter)`);
    console.log(`  ${(APPLY ? 'ÉCRITS' : 'à écrire').padEnd(20)} : ${stats.aEcrire}`);
    if (!APPLY && stats.aEcrire) console.log('\n  Relancer avec --apply pour écrire.');
    console.log('');
})().catch((e) => {
    console.error('\n❌ Échec :', e.message);
    if (/default credentials/i.test(e.message)) {
        console.error('   Identifiants manquants : lancer une fois « gcloud auth application-default login ».');
    }
    process.exit(1);
});
