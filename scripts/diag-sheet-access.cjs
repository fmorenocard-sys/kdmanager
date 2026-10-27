/**
 * diag-sheet-access.cjs
 * « Pourquoi ce joueur ne peut-il pas enregistrer sa fiche ? » — répond en
 * mesurant, au lieu de supposer.
 *
 * La règle qui autorise l'écriture d'une fiche (BR-027) :
 *
 *   canAccessSheet(gid) = isKingOrOfficer() || hasClaimed(gid)
 *   hasClaimed(gid)     = user_profiles/{uid}.warGovernorIds contient gid
 *
 * Trois façons d'échouer, que ce script distingue :
 *   1. personne n'a réclamé ce gouverneur — rien à refléter, accès refusé ;
 *   2. il est réclamé en FILLER : le miroir ne contient que les comptes de
 *      guerre, donc l'écran s'affiche mais l'enregistrement est refusé ;
 *   3. il est réclamé en guerre mais le miroir ne suit pas — profil d'avant
 *      E-010 que la connexion n'a pas encore réparé (BUG-021).
 *
 * Lecture SEULE. Aucun écrit, jamais.
 *
 * Usage :
 *   node scripts/diag-sheet-access.cjs prod --key functions/serviceAccountKey.json --gov 752760
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

const argv = process.argv;
const valueOf = (flag) => {
    const i = argv.indexOf(flag);
    if (i === -1) return null;
    const v = argv[i + 1];
    if (!v || v.startsWith('--')) { console.error(`\n❌ « ${flag} » attend une valeur.\n`); process.exit(1); }
    return v;
};

const arg = (argv[2] || '').trim();
const gov = valueOf('--gov');
const keyPath = valueOf('--key');
const DB_NAME = process.env.BACKFILL_DB || 'kdmanagerdb';

if (!arg || !gov) {
    console.error('❌ Usage : node scripts/diag-sheet-access.cjs <prod|pilot|…> --key <clé.json> --gov <id de gouverneur>');
    process.exit(1);
}
const projectId = ALIASES[arg.toLowerCase()] || (arg.startsWith('kd-') ? arg : null);
if (!projectId) { console.error(`❌ Projet inconnu : « ${arg} ».`); process.exit(1); }

const estProblemeIdentifiants = (e) => /default credentials|could not load|unable to detect|invalid_grant|ADC/i
    .test(String((e && e.message) || e));
function expliquerIdentifiants(m) {
    console.error('\n❌ Identifiants Google introuvables.\n');
    console.error('   node scripts/diag-sheet-access.cjs prod --key functions/serviceAccountKey.json --gov <id>\n');
    if (m) console.error(`   Détail : ${m}\n`);
    process.exit(1);
}
process.on('unhandledRejection', (e) => { if (estProblemeIdentifiants(e)) expliquerIdentifiants(e && e.message); console.error('\n❌', (e && e.stack) || e); process.exit(1); });
process.on('uncaughtException', (e) => { if (estProblemeIdentifiants(e)) expliquerIdentifiants(e && e.message); console.error('\n❌', (e && e.stack) || e); process.exit(1); });

let credential = null;
if (keyPath) {
    const abs = path.resolve(keyPath);
    if (!fs.existsSync(abs)) { console.error(`\n❌ Clé introuvable : ${abs}\n`); process.exit(1); }
    const brut = JSON.parse(fs.readFileSync(abs, 'utf8'));
    if (brut.project_id && brut.project_id !== projectId) {
        console.error(`\n❌ Cette clé appartient au projet « ${brut.project_id} », pas à « ${projectId} ».\n`);
        process.exit(1);
    }
    credential = cert(abs);
}

const db = getFirestore(initializeApp({ credential: credential || applicationDefault(), projectId }), DB_NAME);

(async () => {
    const GOV = String(gov);
    console.log(`\n🔎 Accès à la fiche du gouverneur ${GOV} — projet ${projectId}\n`);

    const roster = ((await db.doc('static_data/players').get()).data() || {}).list || [];
    const joueur = roster.find((r) => String(r.id) === GOV);
    console.log(`  roster        : ${joueur ? joueur.name : '⚠️  absent du dernier scan'}`);

    const prog = await db.doc('mentoring_program/main').get();
    const scope = prog.exists ? (prog.data().scopeGovernorIds || []).map(String) : [];
    console.log(`  périmètre     : ${scope.includes(GOV) ? 'oui' : '⚠️  NON — la fiche ne compte pas dans le suivi'}`);

    const sheet = await db.doc(`mentoring_sheets/${GOV}`).get();
    console.log(`  fiche serveur : ${sheet.exists ? `existe, maj ${sheet.data().updatedAt || '?'}` : 'inexistante'}`);

    // Qui réclame ce gouverneur, et comment ?
    const profils = await db.collection('user_profiles').get();
    const porteurs = [];
    for (const d of profils.docs) {
        const p = d.data();
        const compte = (p.accounts || []).find((a) => a && String(a.governorId) === GOV);
        const primaire = String(p.governorId || '') === GOV;
        const miroir = (p.warGovernorIds || []).map(String).includes(GOV);
        if (compte || primaire || miroir) {
            porteurs.push({ uid: d.id, type: compte ? compte.type : (primaire ? '(primaire, hors accounts[])' : '—'), primaire, miroir });
        }
    }

    console.log('');
    if (!porteurs.length) {
        console.log('  ❌ PERSONNE n\'a réclamé ce gouverneur.');
        console.log('     → `hasClaimed` est faux : seul le leadership peut écrire cette fiche.');
        console.log('     → Le joueur doit RÉCLAMER son compte dans l\'app (profil), ou un mentor saisit pour lui.');
    }
    for (const b of porteurs) {
        const role = (await db.doc(`roles/${b.uid}`).get()).data()?.role || '(aucun rôle)';
        console.log(`  compte d'app  : ${b.uid}`);
        console.log(`     rôle       : ${role}`);
        console.log(`     réclamé en : ${b.type}${b.primaire ? ' · PRIMAIRE' : ''}`);
        console.log(`     miroir     : ${b.miroir ? 'oui' : '❌ NON'}`);
        const leadership = ['King', 'Officer', 'Admin'].includes(role);
        if (b.miroir || leadership) {
            console.log(`     verdict    : ✅ peut enregistrer${leadership && !b.miroir ? ' (par son rôle, pas par la réclamation)' : ''}`);
        } else if (b.type === 'filler') {
            console.log('     verdict    : ❌ REFUSÉ — compte réclamé en FILLER.');
            console.log('                  Le miroir ne contient que les comptes de GUERRE : l\'écran s\'affiche,');
            console.log('                  l\'enregistrement est refusé. Le joueur doit le reclasser en compte de guerre.');
        } else {
            console.log('     verdict    : ❌ REFUSÉ — réclamé en guerre mais miroir absent (BUG-021).');
            console.log('                  Une reconnexion le répare ; sinon relancer backfill-war-governor-ids.cjs.');
        }
        console.log('');
    }
})().catch((e) => {
    if (estProblemeIdentifiants(e)) expliquerIdentifiants(e.message);
    console.error('\n❌ Échec :', e.message);
    process.exit(1);
});
