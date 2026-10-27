/**
 * mentoring-scope.cjs
 * Lit et modifie le PÉRIMÈTRE du programme de mentorat —
 * `mentoring_program/main.scopeGovernorIds` (BR-031).
 *
 * POURQUOI UN OUTIL D'AJOUT, et pas une ré-exécution de l'amorçage. Le périmètre
 * est une COPIE FIGÉE de `static_data/kvk` : on copie, on ne lit jamais en direct,
 * parce que cette liste est réécrite à chaque ouverture de KvK et que le
 * dénominateur du Conseil changerait tout seul en pleine campagne. Conséquence :
 * un joueur absent de la liste KvK ne peut pas entrer dans le périmètre par
 * ré-amorçage — l'amorçage recopierait la même source. Il faut l'ajouter
 * explicitement, et c'est voulu : chaque ajout est une décision du Conseil.
 *
 * GARDE-FOU DE SAISIE. Un id inconnu du roster est signalé AVANT écriture. Sans
 * ça, une coquille crée une ligne fantôme dans le suivi du Conseil : un compte
 * « à faire » que personne ne pourra jamais remplir, et qui fausse le compteur
 * pour toujours. L'ajout reste possible malgré l'avertissement (`--force`), parce
 * qu'un compte peut légitimement manquer du dernier scan.
 *
 * ⚠️ PROJET OBLIGATOIRE et SIMULATION PAR DÉFAUT, comme les autres scripts d'ops.
 *
 * Usage :
 *   # voir le périmètre actuel, avec les pseudos
 *   node scripts/mentoring-scope.cjs prod --key functions/serviceAccountKey.json
 *
 *   # simuler un ajout, puis l'appliquer
 *   node scripts/mentoring-scope.cjs prod --key <clé> --add 190986121,64966340
 *   node scripts/mentoring-scope.cjs prod --key <clé> --add 190986121,64966340 --apply
 *
 *   # retirer
 *   node scripts/mentoring-scope.cjs prod --key <clé> --remove 123456 --apply
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
    if (!v || v.startsWith('--')) {
        console.error(`\n❌ « ${flag} » attend une valeur.\n`);
        process.exit(1);
    }
    return v;
};
const idsOf = (flag) => (valueOf(flag) || '')
    .split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);

const arg = (argv[2] || '').trim();
const APPLY = argv.includes('--apply');
const FORCE = argv.includes('--force');
const toAdd = idsOf('--add');
const toRemove = idsOf('--remove');
const keyPath = valueOf('--key');
const DB_NAME = process.env.BACKFILL_DB || 'kdmanagerdb';

if (!arg) {
    console.error('❌ Projet requis. Usage :');
    console.error('   node scripts/mentoring-scope.cjs <prod|pilot|arcelia|mimoso|kd-xxx> --key <clé.json> [--add ids] [--remove ids] [--apply]');
    process.exit(1);
}
const projectId = ALIASES[arg.toLowerCase()] || (arg.startsWith('kd-') ? arg : null);
if (!projectId) {
    console.error(`❌ Projet inconnu : « ${arg} ». Alias : ${Object.keys(ALIASES).join(', ')} — ou un id brut kd-...`);
    process.exit(1);
}

function expliquerIdentifiants(message) {
    console.error('\n❌ Identifiants Google introuvables — rien n\'a été écrit.\n');
    console.error('   Passer la clé EN ARGUMENT, dans la même commande :\n');
    console.error('     node scripts/mentoring-scope.cjs prod --key functions/serviceAccountKey.json\n');
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

const onEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
let credential = null;
let identite = null;
if (!onEmulator && keyPath) {
    const abs = path.resolve(keyPath);
    if (!fs.existsSync(abs)) {
        console.error(`\n❌ Clé introuvable : ${abs}\n`);
        process.exit(1);
    }
    let infos;
    try {
        const brut = JSON.parse(fs.readFileSync(abs, 'utf8'));
        infos = { project_id: brut.project_id, client_email: brut.client_email };
    } catch {
        console.error(`\n❌ Ce fichier n'est pas une clé de compte de service lisible : ${abs}\n`);
        process.exit(1);
    }
    if (infos.project_id && infos.project_id !== projectId) {
        console.error(`\n❌ Cette clé appartient au projet « ${infos.project_id} », pas à « ${projectId} ».\n`);
        process.exit(1);
    }
    credential = cert(abs);
    identite = infos.client_email;
}

const app = initializeApp(
    onEmulator ? { projectId } : { credential: credential || applicationDefault(), projectId },
);
const db = getFirestore(app, DB_NAME);

(async () => {
    const mode = (toAdd.length || toRemove.length) ? (APPLY ? '✍️  ÉCRITURE' : '👀 SIMULATION') : '📋 LECTURE';
    console.log(`\n${mode} — projet ${projectId}, base « ${DB_NAME} »${onEmulator ? ' (ÉMULATEUR)' : ''}`);
    if (identite) console.log(`   identifiants : ${identite}`);

    const ref = db.doc('mentoring_program/main');
    const snap = await ref.get();
    const actuel = snap.exists ? (snap.data().scopeGovernorIds || []).map(String) : [];

    // Pseudos : le périmètre ne stocke que des ids, illisibles seuls.
    const roster = ((await db.doc('static_data/players').get()).data() || {}).list || [];
    const nameOf = (id) => {
        const p = roster.find((r) => String(r.id) === String(id));
        return p ? p.name : null;
    };

    // BR-031 exclut les FILLERS du périmètre, mais rien ne l'appliquait : ni
    // `static_data/kvk` ni `static_data/kvk_filler` ne le disent (mesuré le
    // 2026-10-27 — aucun recoupement entre les deux, alors qu'un filler était
    // bien dans le périmètre). La seule source qui connaisse le type d'un compte
    // est la réclamation du joueur lui-même, `user_profiles.accounts[].type`.
    // On s'en sert pour AVERTIR, jamais pour décider : un compte non réclamé n'y
    // figure pas, et c'est le Conseil qui tranche.
    const fillers = new Map();
    for (const d of (await db.collection('user_profiles').get()).docs) {
        for (const a of (d.data().accounts || [])) {
            if (a && a.type === 'filler' && a.governorId != null) {
                fillers.set(String(a.governorId), d.id);
            }
        }
    }
    const fillerNote = (id) => (fillers.has(id) ? '  ⚠️  réclamé comme FILLER (BR-031 les exclut)' : '');

    console.log(`\n  périmètre actuel : ${actuel.length} compte(s)`);
    if (!toAdd.length && !toRemove.length) {
        actuel.forEach((id) => console.log(`    ${id}  ${nameOf(id) || '⚠️  absent du roster'}${fillerNote(id)}`));
        const dedans = actuel.filter((id) => fillers.has(id));
        if (dedans.length) {
            console.log(`\n  ⚠️  ${dedans.length} filler(s) dans le périmètre — BR-031 les exclut : ${dedans.join(', ')}`);
        }
        console.log('\n  (lecture seule — utiliser --add / --remove pour modifier)\n');
        return;
    }

    const dejaLa = toAdd.filter((id) => actuel.includes(id));
    const ajouts = toAdd.filter((id) => !actuel.includes(id));
    const inconnus = ajouts.filter((id) => !nameOf(id));
    const retraits = toRemove.filter((id) => actuel.includes(id));
    const absents = toRemove.filter((id) => !actuel.includes(id));

    if (ajouts.length) {
        console.log('\n  à AJOUTER :');
        ajouts.forEach((id) => console.log(`    + ${id}  ${nameOf(id) || '⚠️  INCONNU DU ROSTER'}${fillerNote(id)}`));
    }
    if (retraits.length) {
        console.log('\n  à RETIRER :');
        retraits.forEach((id) => console.log(`    - ${id}  ${nameOf(id) || ''}`));
    }
    if (dejaLa.length) console.log(`\n  déjà dans le périmètre (ignorés) : ${dejaLa.join(', ')}`);
    if (absents.length) console.log(`  absents du périmètre (ignorés)   : ${absents.join(', ')}`);

    if (inconnus.length && !FORCE) {
        console.log(`\n❌ ${inconnus.length} id(s) introuvable(s) dans le roster : ${inconnus.join(', ')}`);
        console.log('   Une coquille créerait une ligne fantôme que personne ne pourra remplir.');
        console.log('   Vérifier l\'id, ou relancer avec --force si le compte manque légitimement du dernier scan.\n');
        process.exit(1);
    }

    const futur = actuel.filter((id) => !retraits.includes(id)).concat(ajouts);
    console.log(`\n  périmètre après : ${futur.length} compte(s) (${actuel.length} → ${futur.length})`);

    if (!APPLY) { console.log('\n  (simulation — rien écrit. Relancer avec --apply.)\n'); return; }
    if (!ajouts.length && !retraits.length) { console.log('\n  rien à faire.\n'); return; }

    await ref.set({ scopeGovernorIds: futur }, { merge: true });
    console.log('\n  ✅ périmètre écrit.\n');
})().catch((e) => {
    if (estProblemeIdentifiants(e)) expliquerIdentifiants(e.message);
    console.error('\n❌ Échec :', e.message);
    process.exit(1);
});
