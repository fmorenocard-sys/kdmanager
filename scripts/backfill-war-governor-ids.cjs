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
 * IDENTIFIANTS : une clé de compte de service passée EN ARGUMENT (`--key`), ou à
 * défaut les ADC locales (`gcloud auth application-default login`, si le SDK est
 * installé). L'argument est préféré parce qu'il voyage avec la commande : une
 * variable d'environnement se perd dès que l'export et le lancement partent dans
 * deux terminaux. L'Admin SDK contourne les règles — d'où la simulation par défaut.
 *
 * Usage :
 *   node scripts/backfill-war-governor-ids.cjs prod --key functions/serviceAccountKey.json
 *   node scripts/backfill-war-governor-ids.cjs prod --key functions/serviceAccountKey.json --apply
 *   node scripts/backfill-war-governor-ids.cjs pilot --key <clé du projet pilote> --apply
 *
 * Sur l'émulateur (aucune ADC requise) :
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8082 node scripts/backfill-war-governor-ids.cjs prod --apply
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
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
    console.error('❌ Projet requis. Usage :');
    console.error('   node scripts/backfill-war-governor-ids.cjs <prod|pilot|arcelia|mimoso|kd-xxx> --key <clé.json> [--apply]');
    console.error('   Sans --apply, le script simule : il lit, il compte, il n\'écrit rien.');
    process.exit(1);
}

const projectId = ALIASES[arg.toLowerCase()] || (arg.startsWith('kd-') ? arg : null);
if (!projectId) {
    console.error(`❌ Projet inconnu : « ${arg} ». Alias : ${Object.keys(ALIASES).join(', ')} — ou un id brut kd-...`);
    process.exit(1);
}

/**
 * Message d'aide sur l'absence d'identifiants. Il vit ici parce que l'échec
 * n'arrive PAS dans la chaîne de promesses du script : google-gax résout les
 * identifiants dans un client interne, sur un timer, et la rejection remonte
 * hors de tout `await` — Node la traite en rejection non gérée et tue le
 * processus sur une trace illisible, sans passer par le `.catch` final.
 * Constaté par le Roi le 2026-10-26. D'où les deux crochets ci-dessous.
 */
function expliquerIdentifiants(message) {
    console.error('\n❌ Identifiants Google introuvables — le script n\'a RIEN écrit.\n');
    console.error('   Passer la clé EN ARGUMENT, dans la même commande (une seule ligne) :\n');
    console.error('     node scripts/backfill-war-governor-ids.cjs prod --key functions/serviceAccountKey.json\n');
    console.error('   Une variable d\'environnement ne survit pas d\'un terminal à l\'autre ;');
    console.error('   un argument, si. Lancer d\'abord SANS --apply : la simulation');
    console.error('   valide les identifiants sans rien écrire.\n');
    console.error('   (Alternative, si le SDK gcloud est installé : gcloud auth application-default login)\n');
    if (message) console.error(`   Détail : ${message}\n`);
    process.exit(1);
}

const estProblemeIdentifiants = (e) => /default credentials|could not load|unable to detect|invalid_grant|ADC/i
    .test(String((e && e.message) || e));

process.on('unhandledRejection', (e) => {
    if (estProblemeIdentifiants(e)) expliquerIdentifiants(e && e.message);
    console.error('\n❌ Échec inattendu :', (e && e.stack) || e);
    process.exit(1);
});
process.on('uncaughtException', (e) => {
    if (estProblemeIdentifiants(e)) expliquerIdentifiants(e && e.message);
    console.error('\n❌ Échec inattendu :', (e && e.stack) || e);
    process.exit(1);
});

/**
 * Identifiants. `--key <chemin>` est la voie PRINCIPALE, pas un repli : passer
 * par `GOOGLE_APPLICATION_CREDENTIALS` oblige à exporter une variable puis à
 * lancer le script DANS LE MÊME shell, et la variable se perd dès que les deux
 * commandes partent dans deux terminaux — c'est ce qui est arrivé au Roi le
 * 2026-10-26. Un argument voyage avec la commande, lui.
 */
const keyIdx = process.argv.indexOf('--key');
const keyPath = keyIdx > -1 ? process.argv[keyIdx + 1] : null;
if (keyIdx > -1 && (!keyPath || keyPath.startsWith('--'))) {
    console.error('\n❌ « --key » attend un chemin : --key functions/serviceAccountKey.json\n');
    process.exit(1);
}

const onEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
let credential = null;
let identite = null;

if (!onEmulator && keyPath) {
    const abs = path.resolve(keyPath);
    if (!fs.existsSync(abs)) {
        console.error(`\n❌ Clé introuvable : ${abs}\n   Vérifier le chemin (il est résolu depuis le dossier courant).\n`);
        process.exit(1);
    }
    let infos;
    try {
        // On ne lit QUE l'identité, pour pouvoir prévenir avant d'écrire. La clé
        // elle-même n'est ni affichée ni recopiée : `cert()` relit le fichier.
        const brut = JSON.parse(fs.readFileSync(abs, 'utf8'));
        infos = { project_id: brut.project_id, client_email: brut.client_email };
    } catch {
        console.error(`\n❌ Ce fichier n'est pas une clé de compte de service lisible : ${abs}\n`);
        process.exit(1);
    }
    if (!infos.client_email) {
        console.error(`\n❌ Fichier sans « client_email » : ce n'est pas une clé de compte de service.\n`);
        process.exit(1);
    }
    // Le piège suivant, une fois les identifiants trouvés : une clé du BON format
    // mais du MAUVAIS projet. L'erreur Firestore serait alors un permission-denied
    // opaque — autant le dire ici.
    if (infos.project_id && infos.project_id !== projectId) {
        console.error(`\n❌ Cette clé appartient au projet « ${infos.project_id} », pas à « ${projectId} ».`);
        console.error(`   Prendre la clé du projet visé, ou corriger l'argument de projet.\n`);
        process.exit(1);
    }
    credential = cert(abs);
    identite = infos.client_email;
}

const app = initializeApp(
    onEmulator
        ? { projectId }
        : { credential: credential || applicationDefault(), projectId },
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
    console.log(`\n${APPLY ? '✍️  ÉCRITURE' : '👀 SIMULATION'} — projet ${projectId}, base « ${DB_NAME} »${onEmulator ? ' (ÉMULATEUR)' : ''}`);
    if (identite) console.log(`   identifiants : ${identite}`);
    console.log('');

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
    if (estProblemeIdentifiants(e)) expliquerIdentifiants(e.message);
    console.error('\n❌ Échec :', e.message);
    process.exit(1);
});
