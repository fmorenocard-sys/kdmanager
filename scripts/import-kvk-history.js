/**
 * import-kvk-history.js — one-shot import of past KvK campaigns into kvk_history (US-013 / F-015).
 *
 * Sources:
 *   SoC 1 "Tides of War"        — Google Sheet (KVK_HISTORY_SOC1_SHEET_ID in .env), "Our DKP" + "Filler_Alt" tabs
 *   SoC 2 "Storm of Stratagems" — public/data/SoC_2_StormOfStratagems_2025.xlsx, "Performance Analysis" + "Filler Accounts"
 *   SoC 3 "Heroic Anthem"       — archives/kvk/soc3_heroic_anthem_2026/ (exact Firestore backup of 2026-07-11)
 *
 * Usage:
 *   node scripts/import-kvk-history.js           # dry run: parse and print totals for validation
 *   node scripts/import-kvk-history.js --write   # persist to kvk_history (skips docs that already exist)
 *
 * Requires functions/serviceAccountKey.json (Admin SDK). Never overwrites an existing campaign doc.
 */

/* global process, Buffer */
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { createRequire } from 'module';

const ROOT = process.cwd();
// firebase-admin is a dependency of functions/, not the web app — resolve it from there
const requireFromFunctions = createRequire(path.join(ROOT, 'functions', 'package.json'));
const WRITE = process.argv.includes('--write');

const SOC1_SHEET_ID = '1t5vjlXC_ReH68bphW1ZqxJ4_lR4q4nmnG5bKGymw8k8';

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null; // "TBA" and blanks become null, not 0
};

async function downloadSheet(sheetId, dest) {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Sheet download failed: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error('Response is not an xlsx (sheet not link-shared?)');
    fs.writeFileSync(dest, buf);
    return dest;
}

function rowsOf(workbook, tab) {
    const sheet = workbook.Sheets[tab];
    if (!sheet) throw new Error(`Tab '${tab}' not found`);
    return XLSX.utils.sheet_to_json(sheet, { header: 1 });
}

// --- SoC 1: "Our DKP" (header row 2). Initial power/KP derived from diffs; goal = "our dkp status" ratio.
function parseSoc1(workbook) {
    const list = rowsOf(workbook, 'Our DKP').slice(3)
        .filter(r => r && typeof r[0] === 'number' && r[1])
        .map(r => ({
            id: r[0], name: r[1],
            finalPower: num(r[2]), finalKp: num(r[3]),
            initialPower: num(r[2]) !== null && num(r[4]) !== null ? num(r[2]) - num(r[4]) : null,
            initialKp: num(r[3]) !== null && num(r[5]) !== null ? num(r[3]) - num(r[5]) : null,
            totalPowerDiff: num(r[4]), totalKpGained: num(r[5]),
            totalDead: num(r[14]),
            goalPercent: num(r[19]), // "our dkp status" = Our DKP / Min DKP Req
            rate: null // SoC 1 had no Excellent/Good rating system
        }));
    const fillerList = rowsOf(workbook, 'Filler_Alt').slice(3)
        .filter(r => r && typeof r[0] === 'number' && r[1])
        .map(r => ({
            id: r[0], name: r[1],
            initialPower: num(r[2]), finalPower: num(r[3]), kp: num(r[4]),
            totalDead: num(r[8]), t4Dead: num(r[11]), t5Dead: num(r[12]),
            pass4Dead: null, pass7Dead: null, klDead: null,
            goalPercent: num(r[15]) // "our dkp status"
        }));
    return { list, fillerList };
}

// --- SoC 2: same family as SoC 4 but without Kills/Acclaim columns (totalDead at 8, %Goal at 14).
function parseSoc2(workbook) {
    const list = rowsOf(workbook, 'Performance Analysis').slice(3)
        .filter(r => r && typeof r[0] === 'number' && r[1])
        .map(r => ({
            id: r[0], name: r[1],
            initialPower: num(r[2]), finalPower: num(r[3]),
            initialKp: num(r[4]), finalKp: num(r[5]),
            totalDead: num(r[8]), totalPowerDiff: num(r[9]), totalKpGained: num(r[10]),
            goalPercent: num(r[14]), rate: r[18] ?? null
        }));
    const fillerList = rowsOf(workbook, 'Filler Accounts').slice(2)
        .filter(r => r && typeof r[0] === 'number' && r[1])
        .map(r => ({
            id: r[0], name: r[1],
            initialPower: num(r[2]), kp: num(r[3]), finalPower: num(r[6]),
            t4Dead: num(r[12]), t5Dead: num(r[13]),
            pass4Dead: num(r[14]), pass7Dead: num(r[15]), klDead: num(r[16]),
            totalDead: num(r[17]), goalPercent: num(r[19])
        }));
    return { list, fillerList };
}

// --- SoC 3: exact backup of the Firestore docs, no parsing.
function parseSoc3() {
    const dir = path.join(ROOT, 'archives', 'kvk', 'soc3_heroic_anthem_2026');
    return {
        list: JSON.parse(fs.readFileSync(path.join(dir, 'kvk_stats.json'), 'utf8')).list,
        fillerList: JSON.parse(fs.readFileSync(path.join(dir, 'kvk_filler_stats.json'), 'utf8')).list
    };
}

function summarize(label, data) {
    const t = (arr, f) => arr.reduce((a, p) => a + (p[f] || 0), 0);
    console.log(`\n=== ${label}`);
    console.log(`  mains: ${data.list.length} | fillers: ${data.fillerList.length}`);
    console.log(`  totalDead: ${t(data.list, 'totalDead').toLocaleString()} | totalKpGained: ${t(data.list, 'totalKpGained').toLocaleString()}`);
    console.log(`  sample: ${JSON.stringify(data.list[0])}`);
}

const tmp = path.join(ROOT, 'tmp');
if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);

const soc1Wb = XLSX.readFile(await downloadSheet(SOC1_SHEET_ID, path.join(tmp, 'soc1_import.xlsx')));
const campaigns = [
    {
        docId: 'soc1_tides_of_war_2025',
        title: 'SoC 1: Tides of War (2025)',
        order: 1, startDate: '2025-09-17', endDate: '2025-11-06',
        source: `Google Sheet ${SOC1_SHEET_ID} (Our DKP / Filler_Alt), initial power & KP derived from diff columns; no rating system that season`,
        ...parseSoc1(soc1Wb)
    },
    {
        docId: 'soc2_storm_of_stratagems_2025',
        title: 'SoC 2: Storm of Stratagems (2025)',
        order: 2, startDate: null, endDate: null, // A-008: dates to confirm
        source: 'public/data/SoC_2_StormOfStratagems_2025.xlsx (Performance Analysis / Filler Accounts)',
        ...parseSoc2(XLSX.readFile(path.join(ROOT, 'public', 'data', 'SoC_2_StormOfStratagems_2025.xlsx')))
    },
    {
        docId: 'soc3_heroic_anthem_2026',
        title: 'SoC 3: Heroic Anthem (2026)',
        order: 3, startDate: null, endDate: null, // A-008: dates to confirm
        source: 'Firestore static_data backup taken 2026-07-11 before SoC 4 overwrite',
        ...parseSoc3()
    }
];

for (const c of campaigns) summarize(`${c.title} [${c.docId}]`, c);

if (!WRITE) {
    console.log('\nDry run only. Re-run with --write to persist.');
    process.exit(0);
}

const { initializeApp, cert } = requireFromFunctions('firebase-admin/app');
const { getFirestore } = requireFromFunctions('firebase-admin/firestore');
const app = initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, 'functions', 'serviceAccountKey.json'), 'utf8'))) });
const db = getFirestore(app, 'kdmanagerdb');

for (const c of campaigns) {
    const ref = db.collection('kvk_history').doc(c.docId);
    if ((await ref.get()).exists) {
        console.log(`SKIP ${c.docId} — already archived`);
        continue;
    }
    const { docId: _, ...docData } = c;
    await ref.set({ ...docData, archivedAt: new Date().toISOString(), importedBy: 'import-kvk-history.js' });
    console.log(`WROTE kvk_history/${c.docId}`);
}
console.log('Done.');
