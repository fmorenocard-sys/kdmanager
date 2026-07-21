/**
 * parse.js — Lecture et normalisation d'un scan KvK (.xlsx) (E-005 / F-018).
 * Portage 1:1 de src/ingest.py du KvK Manager Python.
 *
 * Un scan = classeur 4 feuilles ; seules « Full Data » (référence joueurs) et
 * « Basic Data » (complément du mapping royaume→camp) sont nécessaires au moteur
 * (les feuilles Summary ne servaient qu'à l'affichage Streamlit).
 * Pièges gérés (BRIEF §3.7) : nombres stockés en texte (cast strict, '' → null),
 * noms unicode conservés tels quels, feuille absente → warning + on continue.
 */

import * as XLSX from "xlsx";

// Nom de fichier — 2 formats observés :
//   base      : 001_BASE_SCAN_1249539_06_11_2026,_09_02_17_AM.xlsx
//   suivants  : 002_1249539_06_16_2026,_11_07_14_AM.xlsx
// `BASE_` et `SCAN_` indépendamment optionnels ; séparateur année/heure libre.
const FNAME_RE = new RegExp(
    "^(\\d+)_(BASE_)?(?:SCAN_)?(\\d+)_" +
    "(\\d{2})_(\\d{2})_(\\d{4})\\D+" +
    "(\\d{2})_(\\d{2})_(\\d{2})_(AM|PM)",
    "i",
);

const SHEET_FULL = "Full Data";
const SHEET_BASIC = "Basic Data";

const TEXT_COLS = new Set(["name"]);
const DATETIME_COLS = new Set(["first_update", "last_update", "latest_update"]);

/**
 * Extrait séquence + horodatage + marqueur base depuis le nom de fichier.
 * @param {string} filename
 * @return {object|null} { scanFile, scanSeq, scanId, scanTs, isBase } ou null
 */
export function parseScanFilename(filename) {
    const name = String(filename).split(/[\\/]/).pop();
    const m = FNAME_RE.exec(name);
    if (!m) return null;
    const [, seq, base, sid, mm, dd, yyyy, hh, min, ss, ap] = m;
    let hour = Number(hh) % 12;
    if (ap.toUpperCase() === "PM") hour += 12;
    const ts = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), hour, Number(min), Number(ss)));
    return {
        scanFile: name,
        scanSeq: Number(seq),
        scanId: sid,
        scanTs: Number.isNaN(ts.getTime()) ? null : ts.toISOString(),
        isBase: Boolean(base),
    };
}

/**
 * Cast texte → nombre, aligné sur pandas.to_numeric(errors="coerce") :
 * null / chaîne vide / non-numérique → null (jamais 0 par défaut).
 * @param {*} v
 * @return {number|null}
 */
function toNumber(v) {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

/**
 * Normalise les lignes d'une feuille : cast numérique + colonnes dérivées du scan.
 * @param {Array<object>} rows
 * @param {object} meta résultat de parseScanFilename
 * @return {Array<object>}
 */
function coerceRows(rows, meta) {
    return rows.map((raw) => {
        const rec = {};
        for (const [k, v] of Object.entries(raw)) {
            if (TEXT_COLS.has(k)) {
                rec[k] = v == null ? null : String(v);
            } else if (DATETIME_COLS.has(k)) {
                rec[k] = v == null ? null : String(v);
            } else {
                rec[k] = toNumber(v);
            }
        }
        rec["scan_seq"] = meta.scanSeq;
        rec["scan_ts"] = meta.scanTs;
        rec["scan_file"] = meta.scanFile;
        rec["is_base"] = meta.isBase;
        if ("campid" in rec) rec["camp"] = rec["campid"];
        return rec;
    });
}

/**
 * Lit un scan depuis un Buffer (téléchargé de Storage ou lu du disque).
 * @param {Buffer} source
 * @param {object} meta résultat de parseScanFilename
 * @param {function(string):void} [warn] logger de dégradation propre
 * @return {{full: Array<object>, basic: Array<object>}}
 */
export function readScanWorkbook(source, meta, warn = () => {}) {
    const wb = XLSX.read(source, {type: "buffer", dense: true});

    const readSheet = (sheetName) => {
        const ws = wb.Sheets[sheetName];
        if (!ws) {
            warn(`Feuille "${sheetName}" absente de ${meta.scanFile}`);
            return [];
        }
        // raw:true : valeurs typées telles que stockées ; defval:null : cellules vides explicites.
        return XLSX.utils.sheet_to_json(ws, {raw: true, defval: null});
    };

    return {
        full: coerceRows(readSheet(SHEET_FULL), meta),
        basic: coerceRows(readSheet(SHEET_BASIC), meta),
    };
}

/**
 * Reconstruit {kingdom → camp} depuis toute liste de lignes portant kingdom+camp
 * (les feuilles Summary n'ont pas campid). Conflit → camp majoritaire.
 * @param {Array<Array<object>>} frames
 * @param {function(string):void} [warn]
 * @return {Map<number, number>}
 */
export function buildKingdomCampMap(frames, warn = () => {}) {
    const counts = new Map(); // kingdom -> Map(camp -> n)
    for (const rows of frames) {
        for (const r of rows || []) {
            const kd = r["kingdom"];
            const camp = r["camp"];
            if (kd == null || camp == null) continue;
            if (!counts.has(kd)) counts.set(kd, new Map());
            const c = counts.get(kd);
            c.set(camp, (c.get(camp) || 0) + 1);
        }
    }
    const mapping = new Map();
    for (const [kd, campCounts] of counts) {
        if (campCounts.size > 1) {
            warn(`Royaume ${kd} rattaché à plusieurs camps — choix du majoritaire`);
        }
        let best = null;
        let bestN = -1;
        for (const [camp, n] of campCounts) {
            if (n > bestN) {
                best = camp;
                bestN = n;
            }
        }
        mapping.set(kd, best);
    }
    return mapping;
}
