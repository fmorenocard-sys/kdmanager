/**
 * metrics.js — Définitions métier du DKP de course (E-005 / F-018, BR-010).
 * Portage 1:1 de src/metrics.py du KvK Manager Python (2026_06_KingOfAllBritain).
 *
 * DKP « Classic » : Points = T4_kill-points×4 + T5_kill-points×10 + Deads×6.
 * L'export ne fournit que les COMPTES de kills → poids effectifs sur compteurs :
 *   DKP = net(kills_iv_diff)×40 + net(kills_v_diff)×200 + net(dead_diff)×6
 * Surchargeables par config de campagne (bloc `dkp`) — jamais mélangé au DKP
 * interne 2997 (BR-010).
 */

export const DKP_WEIGHTS = {
    "kills_iv_diff": 40, // T4 : 10 KP/kill × poids 4
    "kills_v_diff": 200, // T5 : 20 KP/kill × poids 10
    "dead_diff": 6, // Deads × 6
};

/**
 * Construit les poids DKP effectifs depuis le bloc `dkp` de la config.
 * Deux formes acceptées (mêmes règles que resolve_dkp_weights côté Python) :
 * poids directs (weight_kills_iv/weight_kills_v/weight_deads) ou forme « outil »
 * (kp_per_t4_kill × mult_t4, etc.). Sans config valide → défauts Classic.
 * @param {object|null|undefined} cfgDkp
 * @return {object} poids effectifs par colonne source
 */
export function resolveDkpWeights(cfgDkp) {
    const w = {...DKP_WEIGHTS};
    if (!cfgDkp || typeof cfgDkp !== "object") return w;
    const num = (v, fallback) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };
    if ("weight_kills_iv" in cfgDkp || "weight_kills_v" in cfgDkp) {
        w["kills_iv_diff"] = num(cfgDkp["weight_kills_iv"], w["kills_iv_diff"]);
        w["kills_v_diff"] = num(cfgDkp["weight_kills_v"], w["kills_v_diff"]);
        w["dead_diff"] = num(cfgDkp["weight_deads"], w["dead_diff"]);
    } else {
        const kp4 = num(cfgDkp["kp_per_t4_kill"], 10);
        const kp5 = num(cfgDkp["kp_per_t5_kill"], 20);
        const m4 = num(cfgDkp["mult_t4"], 4);
        const m5 = num(cfgDkp["mult_t5"], 10);
        w["kills_iv_diff"] = kp4 * m4;
        w["kills_v_diff"] = kp5 * m5;
        w["dead_diff"] = num(cfgDkp["weight_deads"], 6);
    }
    return w;
}

// Colonnes "diff" sur lesquelles on calcule le NET (base scan soustrait).
export const DIFF_METRIC_COLS = [
    "kills_iv_diff",
    "kills_v_diff",
    "dead_diff",
    "kill_points_diff",
    "troop_power_diff",
    "max_units_healed_diff",
    "healed_troops",
    "cur_contribute_diff",
    "power_diff",
    "points_difference",
];

// Métriques de SCORE : net tronqué à 0 si négatif (correction de scan).
// Les autres (power_diff, points_difference) gardent leurs négatifs.
export const SCORE_METRIC_COLS = new Set([
    "kills_iv_diff",
    "kills_v_diff",
    "dead_diff",
    "kill_points_diff",
    "max_units_healed_diff",
    "healed_troops",
    "cur_contribute_diff",
    "troop_power_diff",
]);

/**
 * DKP depuis les composantes nettes. Propagation du null (donnée manquante)
 * comme le Int64 nullable pandas : une composante nulle → DKP nul.
 * @param {number|null} netT4
 * @param {number|null} netT5
 * @param {number|null} netDeads
 * @param {object} [weights]
 * @return {number|null}
 */
export function dkpFromComponents(netT4, netT5, netDeads, weights) {
    if (netT4 == null || netT5 == null || netDeads == null) return null;
    const w = weights || DKP_WEIGHTS;
    return netT4 * w["kills_iv_diff"] + netT5 * w["kills_v_diff"] + netDeads * w["dead_diff"];
}
