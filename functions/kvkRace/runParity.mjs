/**
 * runParity.mjs — Test de parité Python → JS du moteur KvK Race (E-005, jalon 1).
 *
 * Rejoue les scans réels à travers le moteur JS (parse + engine) et compare aux
 * sorties de référence générées par le moteur Python (tests/fixtures/kvk_race_parity,
 * cf. Plan_Execution_E005_Phase1.md §3). Tolérance ZÉRO sur toutes les valeurs.
 *
 * Usage :
 *   node kvkRace/runParity.mjs <scansDir> [fixturesDir]
 * Codes retour : 0 = parité totale, 1 = écarts détectés.
 */

import {readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";
import {parseScanFilename, readScanWorkbook} from "./parse.js";
import {buildAll} from "./engine.js";
import {resolveDkpWeights} from "./metrics.js";

const scansDir = process.argv[2];
const fixturesDir = process.argv[3] || join(process.cwd(), "..", "tests", "fixtures", "kvk_race_parity");
if (!scansDir) {
    console.error("Usage: node kvkRace/runParity.mjs <scansDir> [fixturesDir]");
    process.exit(2);
}

// --- Mini parseur CSV (RFC 4180 : champs entre guillemets, virgules, retours ligne) ---
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === "\"") {
                if (text[i + 1] === "\"") {
                    field += "\"";
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
        } else if (ch === "\"") {
            inQuotes = true;
        } else if (ch === ",") {
            row.push(field);
            field = "";
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++;
            row.push(field);
            field = "";
            if (row.length > 1 || row[0] !== "") rows.push(row);
            row = [];
        } else {
            field += ch;
        }
    }
    if (field !== "" || row.length) {
        row.push(field);
        rows.push(row);
    }
    const header = rows.shift();
    return rows.map((r) => Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ""])));
}

const num = (s) => (s === "" || s == null ? null : Number(s));

function loadFixture(name) {
    return parseCsv(readFileSync(join(fixturesDir, name), "utf8"));
}

// --- Chargement des scans via le moteur JS ---
const manifest = JSON.parse(readFileSync(join(fixturesDir, "manifest.json"), "utf8"));
const cfg = manifest.config || {};

const metas = [];
for (const f of readdirSync(scansDir).sort()) {
    if (!f.toLowerCase().endsWith(".xlsx") || f.startsWith("~$")) continue;
    const meta = parseScanFilename(f);
    if (!meta) {
        console.warn(`Nom de scan non reconnu, ignoré : ${f}`);
        continue;
    }
    meta.path = join(scansDir, f);
    metas.push(meta);
}
metas.sort((a, b) => (a.scanSeq - b.scanSeq) || String(a.scanTs).localeCompare(String(b.scanTs)));

console.log(`Scans : ${metas.length} (${metas.map((m) => m.scanSeq).join(", ")})`);
const t0 = Date.now();
const players = [];
for (const m of metas) {
    const {full} = readScanWorkbook(readFileSync(m.path), m, (msg) => console.warn(msg));
    players.push(...full);
    console.log(`  seq ${m.scanSeq} : ${full.length} lignes Full Data${m.isBase ? " [BASE]" : ""}`);
}
console.log(`Lecture : ${((Date.now() - t0) / 1000).toFixed(1)}s, ${players.length} lignes joueur`);

const data = buildAll(players, metas, {
    baseSeq: cfg["base_scan_override"],
    exclusions: cfg["exclusions"] || [],
    dkpWeights: resolveDkpWeights(cfg["dkp"]),
    heroDuel: (cfg["hero_duel"] || [2, 3]).map(Number),
    info: (msg) => console.log(`  ${msg}`),
});
console.log(`Moteur : base_seq=${data.baseSeq}, ${data.players.length} lignes nettes, ` +
    `${data.kingdoms.length} royaumes×scans, ${data.camps.length} camps×scans`);

// --- Comparaisons ---
let failures = 0;
const MAX_PRINT = 12;
function fail(msg) {
    failures++;
    if (failures <= MAX_PRINT) console.error(`  ✗ ${msg}`);
}

function compareTable(label, fixtureRows, computedRows, keyCols) {
    const keyOf = (r) => keyCols.map((k) => String(num(String(r[k] ?? "")))).join("|");
    const computedByKey = new Map(computedRows.map((r) => [keyCols.map((k) => String(r[k])).join("|"), r]));
    const before = failures;
    if (fixtureRows.length !== computedRows.length) {
        fail(`${label}: ${computedRows.length} lignes calculées vs ${fixtureRows.length} attendues`);
    }
    const valueCols = Object.keys(fixtureRows[0]).filter((c) => !keyCols.includes(c));
    for (const exp of fixtureRows) {
        const got = computedByKey.get(keyOf(exp));
        if (!got) {
            fail(`${label}: ligne absente pour ${keyOf(exp)}`);
            continue;
        }
        for (const c of valueCols) {
            const e = c === "name" ? (exp[c] === "" ? null : exp[c]) : num(exp[c]);
            const g = got[c] ?? null;
            const equal = c === "name" ? String(e) === String(g) : (e == null ? g == null : g === e);
            if (!equal) fail(`${label} ${keyOf(exp)} ${c}: attendu ${e}, obtenu ${g}`);
        }
    }
    console.log(failures === before ?
        `✔ ${label} : ${fixtureRows.length} lignes identiques` :
        `✗ ${label} : écarts (${failures - before})`);
}

compareTable("camps", loadFixture("camps.csv"), data.camps, ["scan_seq", "camp"]);
compareTable("kingdoms", loadFixture("kingdoms.csv"), data.kingdoms, ["scan_seq", "kingdom"]);
compareTable("duel", loadFixture("duel.csv"), data.duel, ["scan_seq"]);

// players_top200 : (a) chaque ligne de référence = mêmes valeurs pour ce gouverneur ;
// (b) par scan, le multiset des dkp_net du top 200 JS = celui de la référence
// (l'ordre exact des ex æquo n'est pas garanti entre pandas et JS — même valeur exigée).
{
    const fixture = loadFixture("players_top200.csv");
    const before = failures;
    const byKey = new Map();
    for (const r of data.players) {
        const k = `${r["scan_seq"]}|${r["governor_id"]}`;
        if (!byKey.has(k)) byKey.set(k, r);
    }
    const valueCols = ["name", "kingdom", "camp", "dkp_net", "net_kills_iv_diff",
        "net_kills_v_diff", "net_dead_diff", "net_kill_points_diff", "latest_power"];
    for (const exp of fixture) {
        const k = `${num(exp["scan_seq"])}|${num(exp["governor_id"])}`;
        const got = byKey.get(k);
        if (!got) {
            fail(`players ${k}: gouverneur absent du calcul JS`);
            continue;
        }
        for (const c of valueCols) {
            const e = c === "name" ? (exp[c] === "" ? null : exp[c]) : num(exp[c]);
            const g = got[c] ?? null;
            const equal = c === "name" ? String(e) === String(g) : (e == null ? g == null : g === e);
            if (!equal) fail(`players ${k} ${c}: attendu ${e}, obtenu ${g}`);
        }
    }
    // (b) multisets de dkp_net par scan
    const expBySeq = new Map();
    for (const r of fixture) {
        const s = num(r["scan_seq"]);
        if (!expBySeq.has(s)) expBySeq.set(s, []);
        expBySeq.get(s).push(num(r["dkp_net"]));
    }
    for (const [seq, expVals] of expBySeq) {
        const jsTop = data.players
            .filter((r) => r["scan_seq"] === seq)
            .sort((x, y) => (y["dkp_net"] ?? -1) - (x["dkp_net"] ?? -1))
            .slice(0, expVals.length)
            .map((r) => r["dkp_net"]);
        const a = [...expVals].sort((x, y) => x - y).join(",");
        const b = [...jsTop].sort((x, y) => x - y).join(",");
        if (a !== b) fail(`players scan ${seq}: multiset dkp_net du top ${expVals.length} différent`);
    }
    console.log(failures === before ?
        `✔ players_top200 : ${fixture.length} lignes identiques (+ multisets par scan)` :
        `✗ players_top200 : écarts (${failures - before})`);
}

if (failures) {
    console.error(`\nPARITÉ ÉCHOUÉE : ${failures} écart(s)${failures > MAX_PRINT ? ` (les ${MAX_PRINT} premiers affichés)` : ""}`);
    process.exit(1);
}
console.log("\nPARITÉ TOTALE ✅ — le moteur JS reproduit le moteur Python à tolérance 0.");
