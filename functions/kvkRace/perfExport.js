/**
 * perfExport.js — F-036 : Performance KvK dérivée du scan ProKingdoms.
 *
 * À la fin de chaque `recomputeRace` (donc à chaque scan de course déposé), rafraîchit
 * `static_data/kvk` (onglet Performance) depuis le DERNIER scan, pour NOTRE royaume, si
 * l'instance est configurée en source `scan`. Remplace, sur les instances sans feuille
 * Google (pilote + futurs clients), le pipeline `syncKvk` (feuille) qui ne tourne que sur
 * 2997.
 *
 * Principes (cf. docs/pm/Spec_Performance_KvK_Source_Scan.md §4) :
 *  - PRÉSERVE la référence figée `initialPower`/`initialKp` (A-005/§4.3.1 — jamais recalculée).
 *  - Lit les colonnes de diff BRUTES du scan (`dead_diff`, `kill_points_diff`) — JAMAIS
 *    `dkp_net` ni les `net_*` (domaine course, post-exclusions) : séparation stricte BR-010.
 *  - Dégradation propre : gouverneur absent du dernier scan → ligne inchangée (jamais 0 trompeur).
 *  - `goalPercent`/`rate` recalculés via `kvkGoals.js` (miroir testé de `src/lib`).
 *
 * Le mapping pur (`refreshPerformanceList`) est isolé et n'importe QUE `../kvkGoals.js`,
 * pour être testable hors contexte Functions (tests/perfExport.test.mjs).
 */

import {computeKvkGoals, rateFromGoalPct} from "../kvkGoals.js";

/* global process */
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "kd-97-manager";

/**
 * Cette instance dérive-t-elle la Performance du scan ? Flag par instance `PERFORMANCE_SOURCE`
 * (`sheet` par défaut). GARDE-FOU DUR : 2997 reste TOUJOURS sur la feuille (`syncKvk`), le scan
 * ne doit jamais y écrire `static_data/kvk` (BR-010, §3.3 — bascule 2997 = chantier séparé).
 * @return {boolean}
 */
export function performanceFromScanEnabled() {
    if (PROJECT_ID === "kd-97-manager") return false;
    return String(process.env.PERFORMANCE_SOURCE || "sheet").toLowerCase() === "scan";
}

/**
 * Indexe les lignes brutes d'un scan par governor_id, filtrées sur un royaume et une séquence.
 * Première occurrence conservée (comme le moteur de course).
 * @param {Array<object>} players lignes dérivées concaténées (LIGHT_COLS, tous scans)
 * @param {number} kingdom notre royaume
 * @param {number} seq séquence du dernier scan
 * @return {Map<string, object>}
 */
export function indexScanRows(players, kingdom, seq) {
    const byGov = new Map();
    for (const r of players) {
        if (r.scan_seq !== seq) continue;
        if (Number(r.kingdom) !== Number(kingdom)) continue;
        if (r.governor_id == null) continue;
        const gid = String(r.governor_id);
        if (byGov.has(gid)) continue;
        byGov.set(gid, r);
    }
    return byGov;
}

/**
 * Mapping PUR : rafraîchit la liste `static_data/kvk` depuis les lignes du dernier scan,
 * en PRÉSERVANT `initialPower`/`initialKp` (référence figée). Testable sans Firestore.
 * @param {Array<object>} existing liste `static_data/kvk` actuelle (référence figée)
 * @param {Map<string, object>} scanByGov lignes brutes du dernier scan par governor_id
 * @return {{list: Array<object>, refreshed: number}}
 */
export function refreshPerformanceList(existing, scanByGov) {
    let refreshed = 0;
    const list = existing.map((p) => {
        const sc = scanByGov.get(String(p.id));
        if (!sc) return p; // absent du dernier scan → inchangé (dégradation propre)
        const initialPower = Number(p.initialPower) || 0;
        const initialKp = Number(p.initialKp) || 0;
        const finalPower = Number(sc.latest_power) || Number(p.finalPower) || 0;
        const totalKpGained = Number(sc.kill_points_diff) || 0; // BRUT (BR-010)
        const totalDead = Number(sc.dead_diff) || 0;
        const goalKp = computeKvkGoals(initialPower).goalKp;
        const goalPercent = goalKp > 0 ? totalKpGained / (goalKp * 1e6) : null;
        const rate = goalPercent != null ? rateFromGoalPct(goalPercent).rate : undefined;
        refreshed++;
        return {
            ...p,
            finalPower,
            finalKp: initialKp + totalKpGained,
            totalKpGained,
            totalDead,
            totalPowerDiff: finalPower - initialPower,
            goalPercent: goalPercent ?? undefined,
            rate: rate ?? undefined,
        };
    });
    return {list, refreshed};
}

/**
 * Écrit `static_data/kvk` depuis le dernier scan de course (F-036), si le flag d'instance
 * l'active. Ne touche JAMAIS 2997 (garde-fou dur). Préserve la référence figée.
 * @param {object} args
 * @param {string} args.campaignId
 * @param {Array<object>} args.players lignes dérivées concaténées (brutes)
 * @param {Array<number>} args.seqs séquences agrégées, triées
 * @param {object} args.cfg config `kvk_race/{campaignId}`
 * @param {object} args.db instance Firestore (getFirestore)
 * @param {function(string):void} [args.info] logger de progression
 * @return {Promise<{status: string, [k: string]: *}>}
 */
export async function writeKvkPerformanceFromScan({campaignId, players, seqs, cfg, db, info = () => {}}) {
    if (!performanceFromScanEnabled()) return {status: "skipped", reason: "flag sheet (ou projet 2997)"};
    const kingdom = Number((cfg && cfg["pinned_kingdoms"] && cfg["pinned_kingdoms"][0]));
    if (!Number.isFinite(kingdom)) return {status: "skipped", reason: "aucun royaume épinglé"};
    if (!seqs || !seqs.length) return {status: "skipped", reason: "aucun scan"};
    const latestSeq = seqs[seqs.length - 1];

    const scanByGov = indexScanRows(players, kingdom, latestSeq);
    if (!scanByGov.size) {
        return {status: "skipped", reason: `aucune ligne pour le royaume ${kingdom} au scan ${latestSeq}`};
    }

    const ref = db.doc("static_data/kvk");
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data().list || []) : [];
    if (!existing.length) {
        // Pas de référence figée : F-036 ne CRÉE pas la référence (elle vient du scan de base
        // manuel `ingest-soc-scan.mjs --kvk-base`, §3.5). Sans elle, on ne fait rien.
        return {status: "skipped", reason: "pas de référence figée static_data/kvk (--kvk-base d'abord)"};
    }

    const {list, refreshed} = refreshPerformanceList(existing, scanByGov);
    await ref.set({
        list,
        updatedAt: new Date().toISOString(),
        perfSource: "scan",
        lastScanSeq: latestSeq,
        lastScanCampaign: campaignId,
    }, {merge: true});
    info(`F-036 static_data/kvk : ${refreshed}/${existing.length} rafraîchis (royaume ${kingdom}, seq ${latestSeq})`);
    return {status: "success", refreshed, total: existing.length, kingdom, latestSeq};
}
