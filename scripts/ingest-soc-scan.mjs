/**
 * ingest-soc-scan.mjs — ingest a ProKingdoms "Scan of Champions" (SoC) workbook into a
 * single kingdom's roster document (static_data/players) for a pilot instance.
 *
 * The SoC scan is a KVK-WIDE export (all kingdoms in the war zone), with a min/max/diff
 * structure: min_* = value at KvK start (first_update), max_* = value at last scan
 * (last_update), *_diff = KvK gain. This differs from the KD 2997 internal format
 * (Top-300 named columns + "Performance Analysis"). See docs/project_context.md.
 *
 * We build a BASE-SCAN roster by taking, for each governor of the target kingdom, the
 * LATEST ABSOLUTE values (latest_power / max_* = most recent full snapshot):
 *   - "Basic Data"  (all governors of the kingdom)      -> id, name, power, kp, location
 *   - "Full Data"   (higher-tier subset, detailed)      -> deads, t4Kills(=kills_iv), t5Kills(=kills_v)
 * Full Data is LEFT-JOINED onto Basic Data by governor_id; governors absent from Full Data
 * keep their Basic-Data fields and simply omit the detailed ones (Firestore drops undefined).
 *
 * Target: project kd-41-manager (alias `pilot`), database `kdmanagerdb`, doc static_data/players.
 * Writes to static_data are Admin-SDK only (firestore.rules denies all client writes).
 *
 * Usage:
 *   node scripts/ingest-soc-scan.mjs --file "<path.xlsx>"                 # dry run -> control JSON
 *   node scripts/ingest-soc-scan.mjs --file "<path.xlsx>" --kingdom 3341  # pick kingdom (default 3341)
 *   node scripts/ingest-soc-scan.mjs --file "<path.xlsx>" --write         # persist to Firestore pilot
 *   node scripts/ingest-soc-scan.mjs --file "<path.xlsx>" --history --write # + append a power/KP evolution point to static_data/history
 *
 * Write requires pilot credentials for kd-41-manager: either
 *   --credentials <serviceAccountKey.json>   (a kd-41-manager service-account key), or
 *   ADC for kd-41-manager (e.g. `gcloud auth application-default login` on that project).
 * The local functions/*.json keys are for kd-97-manager and will be REFUSED for the pilot.
 */

/* global process */
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { createRequire } from 'module';

const ROOT = process.cwd();
const requireFromFunctions = createRequire(path.join(ROOT, 'functions', 'package.json'));

// ---- args ----
function arg(name, def = undefined) {
    const i = process.argv.indexOf(`--${name}`);
    if (i === -1) return def;
    const v = process.argv[i + 1];
    return (v && !v.startsWith('--')) ? v : true;
}
const FILE = arg('file');
const KINGDOM = String(arg('kingdom', '3341'));
const PROJECT = String(arg('project', 'kd-41-manager'));
const CREDENTIALS = arg('credentials');
const OUT_DIR = String(arg('out', path.join(ROOT, 'scratch', 'pilot-ingest')));
const WRITE = process.argv.includes('--write');
// Roster scope: 'detailed' (only governors in Full Data — default), 'all' (every tagged gov),
// or 'threshold' (power >= --min-power).
const ROSTER = String(arg('roster', 'detailed'));
const MIN_POWER = Number(arg('min-power', 0)) || 0;
// Keep only the top N governors by power (0 = no limit). e.g. --top 300 for the kingdom Top 300.
const TOP = Number(arg('top', 0)) || 0;
// --kvk-base : écrit AUSSI static_data/kvk avec initialPower = pouvoir du jour, pour
// que ce scan devienne la RÉFÉRENCE FIGÉE des objectifs (F-027, KvkGoalsPanel préfère
// kvk.initialPower). À lancer sur le scan de base au début du KvK (ex. 5 août).
const KVK_BASE = process.argv.includes('--kvk-base');
// A base scan is a starting point: no gains yet, so powerDiff defaults to 0.
// Pass --keep-powerdiff to instead carry the previous KvK's power_difference.
const KEEP_POWERDIFF = process.argv.includes('--keep-powerdiff');
// --history : accumule un point d'évolution PxKP dans static_data/history à partir des
// TOTAUX NORMALISÉS du roster (Σpower, Σkp). Source-agnostique : fonctionne à l'identique
// quel que soit le format de scan (SoC, ProKingdoms, maison, HeroScroll…) dès lors que le
// roster normalisé `list` est construit. Merge idempotent par date. À passer sur chaque
// scan (base + références) pour que la courbe se construise au fil du KvK.
const HISTORY = process.argv.includes('--history');
const HISTORY_DATE = arg('date'); // "M/D/YYYY" ; défaut = aujourd'hui (même format que le front)
const RESTORE = arg('restore'); // path to a backup JSON to write back verbatim

// helper shared by write + restore: init Admin SDK with pilot creds (refuses cross-tenant)
async function initDb() {
    const { initializeApp, cert, applicationDefault } = requireFromFunctions('firebase-admin/app');
    const { getFirestore } = requireFromFunctions('firebase-admin/firestore');
    let credential;
    if (CREDENTIALS && CREDENTIALS !== true) {
        const sa = JSON.parse(fs.readFileSync(CREDENTIALS, 'utf8'));
        if (sa.project_id !== PROJECT) {
            console.error(`REFUSED: credentials are for project "${sa.project_id}", not "${PROJECT}". Cross-tenant write blocked.`);
            process.exit(1);
        }
        credential = cert(sa);
    } else {
        console.log('No --credentials given; using Application Default Credentials (ADC).');
        credential = applicationDefault();
    }
    const app = initializeApp({ credential, projectId: PROJECT });
    const db = getFirestore(app, 'kdmanagerdb');
    db.settings({ ignoreUndefinedProperties: true });
    return db;
}

// --- restore mode: write a backup JSON back to static_data/players and exit ---
if (RESTORE && RESTORE !== true) {
    const backup = JSON.parse(fs.readFileSync(RESTORE, 'utf8'));
    const db = await initDb();
    console.log(`Restoring static_data/players on ${PROJECT} from ${RESTORE} (${backup.list?.length ?? '?'} governors)...`);
    await db.collection('static_data').doc('players').set(backup);
    console.log('RESTORED. Done.');
    process.exit(0);
}

if (!FILE || FILE === true) {
    console.error('ERROR: --file "<path.xlsx>" is required (or use --restore <backup.json>)');
    process.exit(1);
}

// Big in-game numbers come through as strings; Number() is safe (< 2^53). Blank/garbage -> undefined.
const num = (v) => {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Number(String(v).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : undefined;
};
const str = (v) => (v === null || v === undefined) ? undefined : String(v).trim();

// ---- read workbook ----
console.log(`Reading ${FILE}`);
const wb = XLSX.readFile(FILE, { cellDates: false });
console.log(`Sheets: ${wb.SheetNames.join(', ')}`);

function sheetRows(name) {
    const ws = wb.Sheets[name];
    if (!ws) throw new Error(`Sheet "${name}" not found. Available: ${wb.SheetNames.join(', ')}`);
    return XLSX.utils.sheet_to_json(ws, { defval: null });
}

const basic = sheetRows('Basic Data').filter((r) => String(r.kingdom) === KINGDOM);
const full = sheetRows('Full Data').filter((r) => String(r.kingdom) === KINGDOM);
console.log(`KD ${KINGDOM}: ${basic.length} in Basic Data, ${full.length} in Full Data`);

// Enrichment map keyed by governor_id (as string)
const fullById = new Map();
for (const r of full) fullById.set(String(r.governor_id), r);

// ---- build roster (static_data/players shape) ----
// Field names must match functions/index.js syncPlayers exactly (camelCase, load-bearing):
// rank,id,name,power,kp,deads,t1Kills,t4Kills,t5Kills,ranged,rssGathered,rssAssistance,
// helps,alliance,cityHall,location,notes,powerDiff
let list = basic
    .filter((r) => r.governor_id && r.name)
    .map((r) => {
        const id = String(r.governor_id);
        const f = fullById.get(id);
        const player = {
            id,
            name: str(r.name),
            power: num(r.latest_power) ?? num(r.max_power),   // freshest absolute power
            kp: num(r.max_points),                            // latest kill-points total (max_points === maxkill_points)
            location: str(r.kingdom),
            powerDiff: KEEP_POWERDIFF ? num(r.power_difference) : 0, // base scan: no gain yet -> 0
            alliance: 'Unknown',                              // not present in SoC scan
        };
        if (f) {
            player.deads = num(f.maxdead);
            player.t4Kills = num(f.maxkills_iv);              // tier IV = T4
            player.t5Kills = num(f.maxkills_v);               // tier V  = T5
        }
        // drop undefined so the written doc stays clean (matches ignoreUndefinedProperties)
        for (const k of Object.keys(player)) if (player[k] === undefined) delete player[k];
        return player;
    });

// Dedup by id (defensive; SoC should already be unique per kingdom)
list = Array.from(new Map(list.map((p) => [p.id, p])).values());

// Apply roster scope
const beforeScope = list.length;
if (ROSTER === 'detailed') {
    list = list.filter((p) => p.deads !== undefined); // only governors present in Full Data
} else if (ROSTER === 'threshold') {
    list = list.filter((p) => (p.power || 0) >= MIN_POWER);
} // 'all' keeps everything
console.log(`Roster scope "${ROSTER}"${ROSTER === 'threshold' ? ` (min-power ${MIN_POWER.toLocaleString()})` : ''}: ${list.length}/${beforeScope} kept`);

// Rank by power desc within the kingdom (leaderboard ordering)
list.sort((a, b) => (b.power || 0) - (a.power || 0));
list.forEach((p, i) => { p.rank = i + 1; });

// Keep only the top N by power (e.g. kingdom Top 300)
if (TOP > 0 && list.length > TOP) {
    console.log(`Top limit: keeping ${TOP}/${list.length} governors by power`);
    list = list.slice(0, TOP);
}

const doc = { list, updatedAt: new Date().toISOString(), source: `SoC scan ${path.basename(FILE)} (kingdom ${KINGDOM})` };

// Point d'évolution PxKP (static_data/history) — calculé sur le roster NORMALISÉ,
// donc INDÉPENDANT du fournisseur de scan (le principe : normaliser à l'ingestion,
// la couche d'affichage ne consomme qu'un format interne unique). Voir --history.
const historyPoint = {
    date: (HISTORY_DATE && HISTORY_DATE !== true) ? HISTORY_DATE : new Date().toLocaleDateString('en-US'),
    power: list.reduce((s, p) => s + (p.power || 0), 0),
    kp: list.reduce((s, p) => s + (p.kp || 0), 0),
};

// static_data/kvk (scan de base) : initialPower = pouvoir du jour, référence figée
// des objectifs. finalPower = initialPower au départ (rien d'accumulé). Les scans
// suivants pourront mettre à jour finalPower/totalKpGained/totalDead ; initialPower reste.
const kvkDoc = KVK_BASE ? {
    list: list.map((p) => ({ id: p.id, name: p.name, initialPower: p.power, finalPower: p.power })),
    updatedAt: new Date().toISOString(),
    source: `SoC BASE scan ${path.basename(FILE)} (kingdom ${KINGDOM}) — reference power for goals`,
} : null;

// ---- report + control JSON ----
fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, `players_${KINGDOM}.json`);
fs.writeFileSync(outFile, JSON.stringify(doc, null, 2), 'utf8');
if (kvkDoc) {
    const kvkOut = path.join(OUT_DIR, `kvk_${KINGDOM}.json`);
    fs.writeFileSync(kvkOut, JSON.stringify(kvkDoc, null, 2), 'utf8');
    console.log(`[--kvk-base] static_data/kvk control JSON -> ${kvkOut} (${kvkDoc.list.length} joueurs, initialPower = pouvoir du scan)`);
}
if (HISTORY) {
    const histOut = path.join(OUT_DIR, `history_point_${KINGDOM}.json`);
    fs.writeFileSync(histOut, JSON.stringify(historyPoint, null, 2), 'utf8');
    console.log(`[--history] point d'évolution -> ${histOut} (date ${historyPoint.date}, power ${historyPoint.power.toLocaleString()}, kp ${historyPoint.kp.toLocaleString()})`);
}

const withDetail = list.filter((p) => p.deads !== undefined).length;
const missingPower = list.filter((p) => p.power === undefined).length;
console.log('\n===== MAPPING SUMMARY =====');
console.log(`Roster size (static_data/players.list): ${list.length}`);
console.log(`  with detailed stats (deads/kills):   ${withDetail}`);
console.log(`  basic-only (no Full Data row):        ${list.length - withDetail}`);
console.log(`  missing power:                        ${missingPower}`);
console.log(`Control JSON written to: ${outFile}`);
console.log('\nTop 5 by power:');
for (const p of list.slice(0, 5)) {
    console.log(`  #${p.rank} ${p.name} (id ${p.id}) power=${p.power?.toLocaleString()} kp=${p.kp?.toLocaleString()} deads=${p.deads?.toLocaleString() ?? '—'} t4=${p.t4Kills?.toLocaleString() ?? '—'} t5=${p.t5Kills?.toLocaleString() ?? '—'}`);
}
console.log('\nFields NOT available in SoC scan (left absent): t1Kills, ranged, rssGathered, rssAssistance, helps, cityHall, notes.');

if (!WRITE) {
    console.log('\nDry run only. Review the control JSON, then re-run with --write to persist to Firestore pilot.');
    process.exit(0);
}

// ---- write path (pilot credentials required) ----
const db = await initDb();
const ref = db.collection('static_data').doc('players');

// --- backup existing doc before overwrite (revert safety) ---
const existing = await ref.get();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(OUT_DIR, `backup_players_${PROJECT}_${stamp}.json`);
if (existing.exists) {
    fs.writeFileSync(backupFile, JSON.stringify(existing.data(), null, 2), 'utf8');
    console.log(`\nBackup of current static_data/players -> ${backupFile}`);
    console.log(`  (revert with: node scripts/ingest-soc-scan.mjs --restore "${backupFile}" --credentials <key>)`);
} else {
    console.log('\nNo existing static_data/players doc (nothing to back up; revert = delete the doc).');
}

console.log(`\nWriting static_data/players to project ${PROJECT} (kdmanagerdb)...`);
await ref.set(doc);
console.log(`WROTE static_data/players — ${list.length} governors.`);

// --- static_data/kvk (scan de base) : référence figée des objectifs ---
if (kvkDoc) {
    const kvkRef = db.collection('static_data').doc('kvk');
    const kvkExisting = await kvkRef.get();
    if (kvkExisting.exists) {
        const kvkBackup = path.join(OUT_DIR, `backup_kvk_${PROJECT}_${stamp}.json`);
        fs.writeFileSync(kvkBackup, JSON.stringify(kvkExisting.data(), null, 2), 'utf8');
        console.log(`Backup of current static_data/kvk -> ${kvkBackup}`);
    }
    console.log(`Writing static_data/kvk (base scan, initialPower) to ${PROJECT} (kdmanagerdb)...`);
    await kvkRef.set(kvkDoc);
    console.log(`WROTE static_data/kvk — ${kvkDoc.list.length} joueurs, initialPower figé = référence des objectifs.`);
}

// --- static_data/history (évolution PxKP) : merge idempotent par date ---
if (HISTORY) {
    const histRef = db.collection('static_data').doc('history');
    const histExisting = await histRef.get();
    const prev = (histExisting.exists && Array.isArray(histExisting.data().list)) ? histExisting.data().list : [];
    if (histExisting.exists) {
        const histBackup = path.join(OUT_DIR, `backup_history_${PROJECT}_${stamp}.json`);
        fs.writeFileSync(histBackup, JSON.stringify(histExisting.data(), null, 2), 'utf8');
        console.log(`Backup of current static_data/history -> ${histBackup}`);
    }
    const merged = [...prev];
    const idx = merged.findIndex((p) => p.date === historyPoint.date);
    if (idx >= 0) merged[idx] = historyPoint; // même date -> remplace (ré-ingestion idempotente)
    else merged.push(historyPoint);           // sinon append en fin (ordre chronologique)
    console.log(`Writing static_data/history (${merged.length} points, ${idx >= 0 ? 'updated' : 'appended'} ${historyPoint.date}) to ${PROJECT} (kdmanagerdb)...`);
    await histRef.set({ list: merged, updatedAt: new Date().toISOString() });
    console.log(`WROTE static_data/history — ${merged.length} points d'évolution PxKP.`);
}
console.log('Done.');
