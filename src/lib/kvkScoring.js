/**
 * kvkScoring.js — F-014 / US-009 : statut et note de performance KvK.
 *
 * Deux systèmes coexistent dans le classeur SoC 4, et ils ne disent pas la même
 * chose. Les confondre serait la première source d'erreur ici :
 *
 *  1. **Statut DKP** (onglet Dashboard) — le taux d'atteinte du KP Goal, avec des
 *     seuils **absolus**. Confirmé par le Roi le 2026-07-22 : le « DKP » du royaume
 *     est ce taux, il n'existe pas de barème DKP séparé. C'est le seul des deux qui
 *     ait un sens **pendant** la campagne : un joueur peut connaître son objectif
 *     dès le premier jour.
 *
 *  2. **Note de performance** (onglet Performance Analysis) — un rescaling 1→10
 *     de la cohorte, donc **relatif** : il faut connaître le meilleur et le pire
 *     joueur pour noter qui que ce soit. N'a de sens qu'à la clôture.
 *
 * L'onglet « Objectifs » du War Tracker doit donc afficher le statut absolu, pas
 * la note : sinon l'objectif d'un joueur bougerait au gré des performances des autres.
 */

/** Seuils absolus du taux d'atteinte du KP Goal, relevés sur les 47 joueurs notés
 *  de SoC 4 : Dead Weight 0–15 %, Need Improvement 17–25 %, Good 29–64 %,
 *  Excellent 56–201 %.
 *
 *  Les bornes basses sont nettes (15 % et 25 % — ce sont aussi celles affichées sur
 *  le Dashboard). La frontière Good/Excellent ne l'est pas : entre 56 % et 64 %, huit
 *  joueurs se répartissent dans les deux catégories sans règle apparente, signe d'un
 *  arbitrage manuel du Roi. 60 % est retenu comme milieu de cette zone floue, et
 *  reste configurable. */
export const RATE_THRESHOLDS = {
    needImprovement: 0.15,
    good: 0.25,
    excellent: 0.60
};

export const RATES = {
    DEADWEIGHT: 'Dead Weight',
    NEED_IMPROVEMENT: 'Need Improvement',
    GOOD: 'Good',
    EXCELLENT: 'Excellent'
};

/** Zone où la frontière Good/Excellent est ambiguë dans les données d'origine. */
export const EXCELLENT_FUZZY_BAND = { from: 0.56, to: 0.64 };

/**
 * Statut absolu d'un joueur depuis son taux d'atteinte du KP Goal.
 * @param {number} goalPct taux d'atteinte (1 = 100 %)
 * @param {object} [thresholds] seuils, par défaut RATE_THRESHOLDS
 * @returns {{rate: string, uncertain: boolean}} statut, et si le classement est
 *   dans la zone où les données d'origine étaient contradictoires
 */
export function rateFromGoalPct(goalPct, thresholds = RATE_THRESHOLDS) {
    // `Number(null)` vaut 0 : sans ce test, un joueur sans donnée serait classé
    // Dead Weight au lieu d'être signalé comme non évaluable.
    if (goalPct == null || goalPct === '') return { rate: null, uncertain: false };
    const pct = Number(goalPct);
    if (!Number.isFinite(pct)) return { rate: null, uncertain: false };

    const uncertain = pct >= EXCELLENT_FUZZY_BAND.from && pct <= EXCELLENT_FUZZY_BAND.to;

    if (pct < thresholds.needImprovement) return { rate: RATES.DEADWEIGHT, uncertain: false };
    if (pct < thresholds.good) return { rate: RATES.NEED_IMPROVEMENT, uncertain: false };
    if (pct < thresholds.excellent) return { rate: RATES.GOOD, uncertain };
    return { rate: RATES.EXCELLENT, uncertain };
}

/**
 * Rescaling 1→10 du système de notation du royaume.
 *
 *   Scaled = 1 + ((valeur − min) / (max × 110 % − min)) × 9
 *
 * Le facteur 110 % sur le maximum est volontaire : il empêche le meilleur joueur
 * de saturer l'échelle à 10 et laisse de la marge — d'où un maximum observé autour
 * de 9,15 et non de 10 sur la cohorte SoC 4.
 *
 * @param {number} value valeur du joueur
 * @param {number} min minimum de la cohorte
 * @param {number} max maximum de la cohorte
 * @returns {number|null} note entre 1 et ~9,2, ou null si la cohorte est dégénérée
 */
export function scaleTo10(value, min, max) {
    const span = max * 1.1 - min;
    if (!Number.isFinite(span) || span <= 0) return null;
    return 1 + ((value - min) / span) * 9;
}

/**
 * Note la cohorte entière sur un critère donné.
 * @param {Array<object>} rows joueurs
 * @param {Function} pick extrait la valeur à noter
 * @returns {Array<object>} joueurs enrichis de `score`
 */
export function scoreCohort(rows, pick) {
    const values = rows.map(pick).filter(Number.isFinite);
    if (!values.length) return rows.map((r) => ({ ...r, score: null }));
    const min = Math.min(...values);
    const max = Math.max(...values);
    return rows.map((r) => ({ ...r, score: scaleTo10(pick(r), min, max) }));
}
