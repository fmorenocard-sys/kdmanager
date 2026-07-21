/**
 * engine.js — Nets base-scan, exclusions anti-triche et agrégats (E-005 / F-018).
 * Portage 1:1 de src/transform.py du KvK Manager Python.
 *
 * Règle critique (BRIEF §3.6 du moteur source) :
 *   1. Le base scan (marqueur BASE, sinon plus petite séquence) est la ligne de base.
 *   2. net = valeur_scan_N − valeur_base, PAR governor_id (absent du base → 0 ;
 *      absent du scan N → non inventé ; net de score négatif → tronqué à 0).
 *   3. Agrégation royaume puis camp APRÈS la soustraction, jamais l'inverse.
 *   4. DKP officiel sur valeurs nettes (poids de la config de campagne).
 */

import {
    DIFF_METRIC_COLS,
    SCORE_METRIC_COLS,
    dkpFromComponents,
} from "./metrics.js";

/**
 * Séquence du scan de base : override config > marqueur BASE > plus petite séquence.
 * @param {Array<object>} metas
 * @param {number|null} [override]
 * @return {number|null}
 */
export function resolveBaseSeq(metas, override = null) {
    if (!metas || !metas.length) return null;
    if (override != null) return Number(override);
    for (const m of metas) {
        if (m.isBase) return m.scanSeq;
    }
    return Math.min(...metas.map((m) => m.scanSeq));
}

/**
 * Une exclusion ne s'applique que si sa fenêtre se termine APRÈS la base
 * (sinon elle est déjà absorbée par la soustraction du base scan).
 * @param {object} rule
 * @param {number|null} baseSeq
 * @return {boolean}
 */
export function isExclusionApplicable(rule, baseSeq) {
    if (rule["active"] === false) return false;
    const a = Number(rule["from_seq"]);
    const b = Number(rule["to_seq"]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (b <= a) return false;
    if (baseSeq != null && b <= Number(baseSeq)) return false;
    return true;
}

/** Première ligne par governor_id (ordre d'origine), pour une séquence donnée. */
function firstRowsBySeq(rows, seq) {
    const idx = new Map();
    for (const r of rows) {
        if (r["scan_seq"] !== seq) continue;
        const gov = r["governor_id"];
        if (gov == null || idx.has(gov)) continue;
        idx.set(gov, r);
    }
    return idx;
}

/** Gouverneurs appartenant au périmètre d'une règle (kingdom ou camp). */
function scopeGovernors(rows, rule) {
    const ids = new Set((rule["ids"] || []).map(Number).filter(Number.isFinite));
    if (!ids.size) return new Set();
    const col = (rule["scope_type"] || "kingdom") === "kingdom" ? "kingdom" : "camp";
    const gids = new Set();
    for (const r of rows) {
        if (r[col] != null && ids.has(r[col]) && r["governor_id"] != null) {
            gids.add(r["governor_id"]);
        }
    }
    return gids;
}

/**
 * Gèle la progression d'un périmètre entre from_seq et to_seq : retranche à tout
 * scan ≥ to_seq la quantité valeur[to_seq] − référence (référence = valeur au
 * from_seq, repli sur le base scan, puis 0). Les règles se composent. Mutation
 * en place des lignes (déjà copiées par computeNetPlayers).
 * @param {Array<object>} rows
 * @param {Array<object>|null} exclusions
 * @param {Map<number, object>} baseIdx valeurs du base scan par governor_id
 * @param {number|null} baseSeq
 * @param {function(string):void} [info]
 * @return {Array<object>}
 */
export function applyExclusions(rows, exclusions, baseIdx, baseSeq, info = () => {}) {
    if (!exclusions || !exclusions.length) return rows;
    const cols = DIFF_METRIC_COLS.filter((c) => rows.some((r) => c in r));
    for (const rule of exclusions) {
        if (!isExclusionApplicable(rule, baseSeq)) continue;
        const a = Number(rule["from_seq"]);
        const b = Number(rule["to_seq"]);
        const gids = scopeGovernors(rows, rule);
        if (!gids.size) continue;
        const va = firstRowsBySeq(rows, a);
        const vb = firstRowsBySeq(rows, b);
        for (const c of cols) {
            // sub[gov] = valeur au to_seq − référence — uniquement périmètre + valeur définie.
            const sub = new Map();
            for (const [gov, rowB] of vb) {
                if (!gids.has(gov)) continue;
                const vbVal = rowB[c];
                if (vbVal == null) continue; // dropna
                let ref = va.get(gov) ? va.get(gov)[c] : null;
                if (ref == null) ref = baseIdx.get(gov) ? baseIdx.get(gov)[c] : null;
                if (ref == null) ref = 0;
                sub.set(gov, vbVal - ref);
            }
            if (!sub.size) continue;
            for (const r of rows) {
                if (r["scan_seq"] < b) continue;
                const adj = sub.get(r["governor_id"]);
                if (adj === undefined) continue;
                r[c] = r[c] == null ? null : r[c] - adj;
            }
        }
        info(`Exclusion appliquée : ${rule["scope_type"]} ${JSON.stringify(rule["ids"])}, ` +
            `fenêtre [${a}→${b}], ${gids.size} gouverneurs`);
    }
    return rows;
}

/**
 * Calcule les colonnes net_* et dkp_net au grain joueur×scan.
 * @param {Array<object>} players lignes Full Data concaténées (tous scans)
 * @param {Array<object>} metas métadonnées de scans
 * @param {object} [opts] { baseSeq, exclusions, dkpWeights, info }
 * @return {{rows: Array<object>, baseSeq: number|null, exclusionsApplied: Array<object>}}
 */
export function computeNetPlayers(players, metas, opts = {}) {
    const info = opts.info || (() => {});
    if (!players.length) return {rows: [], baseSeq: null, exclusionsApplied: []};
    const baseSeq = opts.baseSeq != null ? Number(opts.baseSeq) : resolveBaseSeq(metas);
    const cols = DIFF_METRIC_COLS.filter((c) => players.some((r) => c in r));

    // Copie de travail (les exclusions mutent les valeurs brutes).
    const out = players.map((r) => ({...r}));

    // Valeurs de base par gouverneur, snapshot AVANT exclusions.
    const baseIdx = new Map();
    for (const [gov, row] of firstRowsBySeq(out, baseSeq)) {
        baseIdx.set(gov, {...row});
    }

    applyExclusions(out, opts.exclusions, baseIdx, baseSeq, info);

    for (const r of out) {
        for (const c of cols) {
            const baseRow = baseIdx.get(r["governor_id"]);
            const baseVal = baseRow && baseRow[c] != null ? baseRow[c] : 0; // absent du base → 0
            let net = r[c] == null ? null : r[c] - baseVal;
            if (net != null && SCORE_METRIC_COLS.has(c) && net < 0) net = 0;
            r[`net_${c}`] = net == null ? null : Math.round(net);
        }
        r["dkp_net"] = dkpFromComponents(
            r["net_kills_iv_diff"] ?? 0,
            r["net_kills_v_diff"] ?? 0,
            r["net_dead_diff"] ?? 0,
            opts.dkpWeights,
        );
        if (r["dkp_net"] != null) r["dkp_net"] = Math.round(r["dkp_net"]);
    }

    // On n'expose que les scans ≥ base (la base est le point de départ, net 0).
    const rows = baseSeq == null ? out : out.filter((r) => r["scan_seq"] >= baseSeq);
    const exclusionsApplied = (opts.exclusions || [])
        .filter((e) => isExclusionApplicable(e, baseSeq));
    return {rows, baseSeq, exclusionsApplied};
}

const NET_COLS = (rows) => {
    const first = rows.find(Boolean) || {};
    return Object.keys(first).filter((k) => k.startsWith("net_")).concat(["dkp_net"]);
};

/** Somme pandas-like : ignore les nulls ; tout-null → 0. */
function sumNullable(values) {
    let s = 0;
    for (const v of values) {
        if (v != null) s += v;
    }
    return s;
}

/** Premier non-null (sémantique de l'agg "first" pandas). */
function firstNonNull(values) {
    for (const v of values) {
        if (v != null) return v;
    }
    return null;
}

/**
 * Agrège des lignes nettes par clés + couverture + ratios d'efficacité.
 * @param {Array<object>} rows
 * @param {Array<string>} keys ex. ["scan_seq", "kingdom"]
 * @param {object} extras colonnes "first" ou "nunique" supplémentaires
 * @return {Array<object>}
 */
function aggregateBy(rows, keys, extras) {
    if (!rows.length) return [];
    const netCols = NET_COLS(rows);
    const groups = new Map();
    for (const r of rows) {
        const key = keys.map((k) => String(r[k])).join("|");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
    }
    const result = [];
    for (const grp of groups.values()) {
        const rec = {};
        for (const k of keys) rec[k] = grp[0][k];
        for (const c of netCols) rec[c] = sumNullable(grp.map((r) => r[c]));
        rec["total_power"] = sumNullable(grp.map((r) => r["latest_power"]));
        for (const [name, spec] of Object.entries(extras)) {
            if (spec.kind === "first") {
                rec[name] = firstNonNull(grp.map((r) => r[spec.col]));
            } else { // nunique
                rec[name] = new Set(grp.map((r) => r[spec.col]).filter((v) => v != null)).size;
            }
        }
        // Ratios d'efficacité (affichage F-019) — mêmes définitions que _add_efficiency.
        const dkp = rec["dkp_net"];
        if (rec["total_power"]) {
            rec["dkp_per_mpower"] = dkp / (rec["total_power"] / 1e6);
        }
        if (rec["coverage"]) rec["dkp_per_gov"] = dkp / rec["coverage"];
        result.push(rec);
    }
    return result;
}

/** Agrégat par (scan_seq, kingdom) + couverture. */
export function aggregateKingdom(netPlayers) {
    return aggregateBy(netPlayers, ["scan_seq", "kingdom"], {
        "camp": {kind: "first", col: "camp"},
        "scan_ts": {kind: "first", col: "scan_ts"},
        "coverage": {kind: "nunique", col: "governor_id"},
    });
}

/** Agrégat par (scan_seq, camp) + couverture + nb royaumes. */
export function aggregateCamp(netPlayers) {
    return aggregateBy(netPlayers, ["scan_seq", "camp"], {
        "scan_ts": {kind: "first", col: "scan_ts"},
        "coverage": {kind: "nunique", col: "governor_id"},
        "n_kingdoms": {kind: "nunique", col: "kingdom"},
    });
}

/**
 * Vitesse = variation de valueCol entre scans consécutifs, par clé.
 * @param {Array<object>} agg
 * @param {string} key "camp" | "kingdom" | "governor_id"
 * @param {string} [valueCol]
 * @return {Array<object>}
 */
export function addVelocity(agg, key, valueCol = "dkp_net") {
    const out = agg.map((r) => ({...r}))
        .sort((x, y) => (x[key] - y[key]) || (x["scan_seq"] - y["scan_seq"]));
    const prev = new Map();
    for (const r of out) {
        const p = prev.get(r[key]);
        r[`${valueCol}_velocity`] = p === undefined || r[valueCol] == null || p == null ?
            null : r[valueCol] - p;
        prev.set(r[key], r[valueCol]);
    }
    return out;
}

/**
 * Duel hero : table par scan — valeur camp A, camp B, écart (A−B) et sa variation.
 * Écart > 0 ⇒ A devant B.
 * @param {Array<object>} campAgg
 * @param {number} [campA]
 * @param {number} [campB]
 * @param {string} [valueCol]
 * @return {Array<object>}
 */
export function campDuel(campAgg, campA = 2, campB = 3, valueCol = "dkp_net") {
    const bySeq = new Map();
    for (const r of campAgg) {
        if (r["camp"] !== campA && r["camp"] !== campB) continue;
        if (!bySeq.has(r["scan_seq"])) {
            bySeq.set(r["scan_seq"], {"scan_seq": r["scan_seq"], "scan_ts": r["scan_ts"]});
        }
        const rec = bySeq.get(r["scan_seq"]);
        const slot = r["camp"] === campA ? "camp_a" : "camp_b";
        rec[slot] = (rec[slot] || 0) + (r[valueCol] || 0);
    }
    const out = [...bySeq.values()].sort((x, y) => x["scan_seq"] - y["scan_seq"]);
    let prevEcart = null;
    for (const rec of out) {
        rec["camp_a"] = rec["camp_a"] ?? null;
        rec["camp_b"] = rec["camp_b"] ?? null;
        rec["ecart"] = rec["camp_a"] == null || rec["camp_b"] == null ?
            null : rec["camp_a"] - rec["camp_b"];
        rec["ecart_variation"] = prevEcart == null || rec["ecart"] == null ?
            null : rec["ecart"] - prevEcart;
        prevEcart = rec["ecart"];
    }
    return out;
}

/**
 * Helper de haut niveau : tout calculer d'un coup (équivalent build_all).
 * @param {Array<object>} players lignes Full Data concaténées
 * @param {Array<object>} metas
 * @param {object} [opts] { baseSeq, exclusions, dkpWeights, heroDuel, info }
 * @return {object} { players, kingdoms, camps, duel, baseSeq, exclusionsApplied }
 */
export function buildAll(players, metas, opts = {}) {
    const {rows, baseSeq, exclusionsApplied} = computeNetPlayers(players, metas, opts);
    const kingdoms = aggregateKingdom(rows);
    const camps = aggregateCamp(rows);
    const [campA, campB] = opts.heroDuel || [2, 3];
    const duel = campDuel(camps, campA, campB);
    return {players: rows, kingdoms, camps, duel, baseSeq, exclusionsApplied};
}
