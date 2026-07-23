/**
 * kvkGoals.js (functions) — miroir de `src/lib/kvkGoals.js` pour la commande
 * Discord `/mykvkgoals` (F-014 / US-009).
 *
 * Duplication assumée : `functions/` est un paquet séparé, seul son contenu est
 * téléversé au déploiement, il ne peut donc pas importer depuis `src/`. Le garde-fou
 * est le test de parité `tests/kvkGoals.parity.test.mjs`, qui compare les deux
 * implémentations sur un balayage de puissances et casse à la première divergence.
 *
 * Toute modification ici doit être répercutée dans `src/lib/kvkGoals.js`, et
 * réciproquement. Les formules et leur validation sont documentées côté src.
 */

export const DOMAIN_MIN_MPOWER = 16.44;
export const VALIDATED_RANGE_MPOWER = {min: 36.7, max: 119.9};
export const DEAD_POINTS_PER_T5 = 200;

const rawMinKp = (P) => 0.0556843 * P * P - 1.83037 * P + 38.477;
const rawMinDead = (P) => 0.5 * (0.0216159 * P * P + 3.06256 * P - 123.036);
const rawGoalKp = (P) => 0.0642424 * P * P - 0.198182 * P - 10.6061;
const atLeastZero = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

export const toMillions = (power) => (Number(power) || 0) / 1e6;

/**
 * Convertit des points de morts en ordre de grandeur de troupes (exact en 100 % T5).
 * @param {number} deadPointsM points de morts, en millions
 * @return {number} nombre de morts approximatif
 */
export function deadPointsToApproxTroops(deadPointsM) {
    return (deadPointsM * 1e6) / DEAD_POINTS_PER_T5;
}

/**
 * Palier de DKP minimum selon la puissance.
 * @param {number} P puissance en millions
 * @return {number} fraction entre 0 et 1
 */
export function minDkpRatio(P) {
    if (P < 50) return 0.25;
    if (P <= 70) return 0.35;
    return 0.45;
}

/**
 * Calcule les objectifs d'un joueur.
 * @param {number} power puissance brute
 * @param {object} [opts] options
 * @return {object} objectifs et métadonnées
 */
export function computeKvkGoals(power, opts = {}) {
    const {reqDkp = null, capMPower = null} = opts;
    const rawP = toMillions(power);
    const outOfDomain = rawP > 0 && rawP < DOMAIN_MIN_MPOWER;
    const capped = capMPower != null && rawP > capMPower;
    const P = Math.min(
        Math.max(rawP, DOMAIN_MIN_MPOWER),
        capMPower != null ? capMPower : Infinity,
    );

    const minKp = atLeastZero(rawMinKp(P));
    const minDead = atLeastZero(rawMinDead(P));
    const goalKp = atLeastZero(rawGoalKp(P));
    const ratio = minDkpRatio(P);
    const hasReqDkp = Number.isFinite(reqDkp) && reqDkp > 0;

    return {
        powerM: rawP,
        appliedPowerM: P,
        outOfDomain,
        capped,
        minKp,
        goalKp,
        minDead,
        minDeadApproxTroops: deadPointsToApproxTroops(minDead),
        outsideValidatedRange: rawP > 0 &&
            (rawP < VALIDATED_RANGE_MPOWER.min || rawP > VALIDATED_RANGE_MPOWER.max),
        minDkpRatio: ratio,
        reqDkp: hasReqDkp ? reqDkp : null,
        minDkp: hasReqDkp ? reqDkp * ratio : null,
        goalDkp: hasReqDkp ? reqDkp * 2 : null,
        dkpAvailable: hasReqDkp,
    };
}

export const RATE_THRESHOLDS = {needImprovement: 0.15, good: 0.25, excellent: 0.60};
export const RATES = {
    DEADWEIGHT: "Dead Weight",
    NEED_IMPROVEMENT: "Need Improvement",
    GOOD: "Good",
    EXCELLENT: "Excellent",
};
export const EXCELLENT_FUZZY_BAND = {from: 0.56, to: 0.64};

/**
 * Statut absolu depuis le taux d'atteinte du KP Goal.
 * @param {number} goalPct taux d'atteinte (1 = 100 %)
 * @param {object} [thresholds] seuils
 * @return {object} {rate, uncertain}
 */
export function rateFromGoalPct(goalPct, thresholds = RATE_THRESHOLDS) {
    if (goalPct === null || goalPct === undefined || goalPct === "") {
        return {rate: null, uncertain: false};
    }
    const pct = Number(goalPct);
    if (!Number.isFinite(pct)) return {rate: null, uncertain: false};
    const uncertain = pct >= EXCELLENT_FUZZY_BAND.from && pct <= EXCELLENT_FUZZY_BAND.to;
    if (pct < thresholds.needImprovement) return {rate: RATES.DEADWEIGHT, uncertain: false};
    if (pct < thresholds.good) return {rate: RATES.NEED_IMPROVEMENT, uncertain: false};
    if (pct < thresholds.excellent) return {rate: RATES.GOOD, uncertain};
    return {rate: RATES.EXCELLENT, uncertain};
}
