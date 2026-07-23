/**
 * kvkGoals.js — F-014 / US-009 : objectifs individuels KvK indexés sur la puissance.
 *
 * Source des formules : `docs/pm/Etude_Objectifs_KvK.md`, polynômes du second degré
 * avec P exprimé en **millions** de puissance.
 *
 * **Validées contre le classeur SoC 4** (onglet « Performance Analysis », 45 joueurs
 * réels, 2026-07-22) : en reconstituant l'exigence par `KP gagnés / % Min KP`, le
 * rapport réel/formule vaut **1,0000** pour `minKp` comme pour `goalKp`. L'onglet
 * Dashboard le confirme au joueur près (Lord Guineapig, 118 M : exigence affichée
 * 597,4 M, formule 597,4 M). Deux ambiguïtés de l'étude sont donc levées :
 *   - P est la puissance **initiale**, en millions ;
 *   - la sortie KP est en **millions** de KP.
 *
 * `minDead` en revanche **ne se vérifie pas** — voir la note sur DEAD_FORMULA_UNVERIFIED.
 *
 * Domaine interne 2997 (BR-010) : ce DKP n'a rien à voir avec le DKP de course
 * de la coalition. Les deux ne doivent jamais être présentés côte à côte.
 *
 * Trois garde-fous, parce que les courbes brutes produisent des valeurs absurdes
 * en dehors de leur plage d'ajustement (mesuré, pas supposé) :
 *
 *  1. `minDead` devient **négatif sous ~32,7 M** de puissance ;
 *  2. `goalKp` devient **négatif sous ~14,5 M** ;
 *  3. `minKp` a son sommet à **16,44 M** : en dessous, l'exigence *remonte* quand
 *     la puissance baisse — un joueur de 5 M devrait 30,7 quand un joueur de 20 M
 *     ne doit que 24,1. Manifestement non voulu.
 *
 * On plafonne donc à zéro par le bas, on gèle `minKp` à son sommet sous le seuil,
 * et on signale `outOfDomain` pour que l'UI puisse dire que le chiffre est
 * indicatif au lieu de le présenter comme une exigence ferme.
 */

/** Puissance (en millions) sous laquelle les polynômes ne sont plus fiables.
 * Deux raisons convergentes : c'est le sommet de la parabole `minKp` (en dessous,
 * l'exigence remonte quand la puissance baisse), et l'échantillon réel qui a servi
 * à valider les formules ne descend pas sous 36,7 M — tout ce qui est en dessous
 * est de l'extrapolation. */
export const DOMAIN_MIN_MPOWER = 16.44;

/** Plage de puissance réellement observée dans le classeur SoC 4 (45 joueurs). */
export const VALIDATED_RANGE_MPOWER = { min: 36.7, max: 119.9 };

/**
 * `minDead` n'est pas fiable et ne doit pas être présenté comme une exigence ferme.
 *
 * Les deux onglets du classeur SoC 4 se contredisent d'un facteur 200 :
 *   - Dashboard, « Dead Minimal Requirement » : 269,5 M pour un joueur de 118 M —
 *     c'est exactement la formule documentée, mais 269 millions de morts est
 *     impossible (le joueur en compte 3,26 M au total sur toute la campagne) ;
 *   - Performance Analysis, `morts / % Min Dead` : 1,35 M pour le même joueur —
 *     plausible, et cohérent avec un ratio réalisé de 2,42.
 * De plus les exigences reconstituées sont bruitées : à 71,2 M de puissance on
 * trouve 580 484 et 516 001 pour deux joueurs, signe d'ajustements manuels.
 * Un ajustement quadratique sur les 45 points donne 197 % d'erreur maximale.
 */
export const DEAD_FORMULA_UNVERIFIED = true;

const rawMinKp = (P) => 0.0556843 * P * P - 1.83037 * P + 38.477;
const rawMinDead = (P) => 0.5 * (0.0216159 * P * P + 3.06256 * P - 123.036);
const rawGoalKp = (P) => 0.0642424 * P * P - 0.198182 * P - 10.6061;

const atLeastZero = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Convertit une puissance brute (unités du jeu) en millions. */
export const toMillions = (power) => (Number(power) || 0) / 1e6;

/**
 * Palier de DKP minimum : pourcentage du « Req DKP » selon la puissance.
 * @param {number} P puissance en millions
 * @returns {number} fraction entre 0 et 1
 */
export function minDkpRatio(P) {
    if (P < 50) return 0.25;
    if (P <= 70) return 0.35;
    return 0.45;
}

/**
 * Calcule les objectifs d'un joueur.
 *
 * @param {number} power puissance brute (unités du jeu, ex. 60000000)
 * @param {object} [opts]
 * @param {number|null} [opts.reqDkp] « Req DKP » de la campagne. Sa formule
 *   mathématique n'a jamais été fournie (A-005) : il est saisi par le Roi dans la
 *   configuration de campagne. Sans lui, les objectifs DKP ne sont pas calculés —
 *   afficher un chiffre inventé serait pire que de n'en afficher aucun.
 * @param {number|null} [opts.capMPower] plafond de puissance appliqué avant calcul,
 *   pour éviter que la courbe n'explose sur les très grosses puissances (A-005 §3).
 * @returns {object} objectifs et métadonnées de fiabilité
 */
export function computeKvkGoals(power, opts = {}) {
    const { reqDkp = null, capMPower = null } = opts;

    const rawP = toMillions(power);
    const outOfDomain = rawP > 0 && rawP < DOMAIN_MIN_MPOWER;
    const capped = capMPower != null && rawP > capMPower;

    // Sous le sommet, on gèle la valeur : l'exigence ne doit pas remonter.
    const P = Math.min(
        Math.max(rawP, DOMAIN_MIN_MPOWER),
        capMPower != null ? capMPower : Infinity
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

        // KP en millions — unité confirmée contre le classeur SoC 4.
        minKp,
        goalKp,
        // Morts : formule non vérifiable, voir DEAD_FORMULA_UNVERIFIED. Renvoyée
        // pour ne pas perdre l'information, mais accompagnée de son drapeau afin
        // que l'appelant ne l'affiche pas comme une exigence ferme.
        minDead,
        minDeadUnverified: DEAD_FORMULA_UNVERIFIED,
        // Hors de la plage réellement observée : le chiffre est une extrapolation.
        outsideValidatedRange: rawP > 0 && (rawP < VALIDATED_RANGE_MPOWER.min || rawP > VALIDATED_RANGE_MPOWER.max),

        minDkpRatio: ratio,
        reqDkp: hasReqDkp ? reqDkp : null,
        minDkp: hasReqDkp ? reqDkp * ratio : null,
        goalDkp: hasReqDkp ? reqDkp * 2 : null,
        dkpAvailable: hasReqDkp
    };
}

/**
 * Résout le « Req DKP » d'un joueur depuis la configuration de campagne.
 * Deux modes, parce que l'étude laisse la question ouverte (A-005) :
 *  - `constant`   : une valeur unique pour tout le royaume, la variation par
 *                   joueur venant alors des paliers de `minDkpRatio` ;
 *  - `per_mpower` : la valeur est multipliée par la puissance en millions.
 *
 * @param {object} config bloc `goals` de la configuration de campagne
 * @param {number} powerM puissance en millions
 * @returns {number|null} Req DKP, ou null si non configuré
 */
export function resolveReqDkp(config, powerM) {
    if (!config) return null;
    const value = Number(config.reqDkpValue);
    if (!Number.isFinite(value) || value <= 0) return null;
    return config.reqDkpMode === 'per_mpower' ? value * powerM : value;
}
