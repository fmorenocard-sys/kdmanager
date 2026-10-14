/**
 * campaignFreshness.js — « les stats live appartiennent-elles VRAIMENT à la
 * campagne courante ? »
 *
 * `static_data/kvk` est un **singleton « dernier scan » sans identifiant de
 * campagne** (dette A-041 / UXA11Y-010). Entre la clôture d'un KvK et le premier
 * scan du suivant, il contient donc encore les chiffres de la saison PRÉCÉDENTE.
 * Toute vue qui les affiche sous le nom de la nouvelle campagne ment.
 *
 * Constaté sur le pilote 3341 le 2026-10-14 : la frise du royaume affichait les
 * 421 comptes de « 001_Troy » sous « 002_MightyAssembly » — à l'unité près les
 * mêmes chiffres que l'archive juste en dessous, puisque c'est la même donnée.
 *
 * Deux signaux, repris de `useMyKvkGoals` (correctif UXA11Y-010, qui ne couvrait
 * que `/me`) et désormais PARTAGÉS : une vue ne doit plus pouvoir en bénéficier
 * pendant qu'une autre les ignore.
 *
 *   1. **La campagne n'a pas commencé** — `startDate` dans le futur.
 *   2. **Les stats live SONT celles de la dernière archive** — comparées au
 *      chiffre près sur la référence figée (`initialPower`) et le cumul de morts
 *      (`totalDead`), les deux champs qu'un nouveau KvK fait forcément bouger.
 *
 * Volontairement **pur** (aucun import Firebase) : ces règles décident de ce que
 * le Roi voit, elles doivent être testables sans émulateur — même parti pris que
 * `kvkGoals.js`. La normalisation de date est réimplémentée ici plutôt
 * qu'importée de `currentCampaign.js`, qui tire `db` avec lui.
 */

/**
 * Normalise une date en 'YYYY-MM-DD' (UTC). Accepte une chaîne déjà au format ou
 * ISO, une `Date`, un Timestamp Firestore (client ou Admin SDK).
 * La comparaison se fait ensuite sur des chaînes : les dates de campagne sont
 * stockées à minuit UTC, comparer des horodatages exposerait au décalage local.
 * @param {*} v
 * @returns {string|null} 'YYYY-MM-DD' ou null si indécidable
 */
export function toDayUTC(v) {
    if (!v) return null;
    if (typeof v === 'string') return v.slice(0, 10) || null;
    const d = typeof v.toDate === 'function' ? v.toDate()
        : v instanceof Date ? v
            : typeof v.seconds === 'number' ? new Date(v.seconds * 1000)
                : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

/**
 * La campagne est-elle encore à venir ? Sans date connue, on ne présume RIEN :
 * une config non renseignée ne doit pas masquer des données valides.
 * @param {*} startDate date de début (chaîne, Date ou Timestamp)
 * @param {Date} [now]
 * @returns {boolean}
 */
export function campaignNotStarted(startDate, now = new Date()) {
    const start = toDayUTC(startDate);
    if (!start) return false;
    return start > toDayUTC(now);
}

/**
 * Les lignes live sont-elles, au chiffre près, celles de l'archive ?
 *
 * On ne compare que les gouverneurs présents des DEUX côtés. Verdict « archivé »
 * seulement si au moins une ligne a pu être comparée et qu'elles concordent
 * TOUTES : au premier écart réel, on considère les données courantes. Ce sens de
 * prudence est délibéré — masquer des chiffres valides est plus grave que de
 * laisser passer une saison dont personne n'a encore bougé d'un point.
 *
 * `initialPower > 0` est exigé : une ligne sans référence figée ne prouve rien.
 *
 * @param {Array<object>} liveRows lignes live (mains + fillers)
 * @param {Map<string, object>|null} archiveById archive la plus récente, indexée par id
 * @returns {boolean}
 */
export function statsMatchArchive(liveRows, archiveById) {
    if (!archiveById || !archiveById.size || !Array.isArray(liveRows) || !liveRows.length) return false;
    let compared = 0;
    for (const live of liveRows) {
        const arch = archiveById.get(String(live?.id));
        if (!arch) continue;
        const ip = Number(live.initialPower || 0);
        if (!(ip > 0)) continue;
        compared++;
        if (ip !== Number(arch.initialPower || 0)) return false;
        if (Number(live.totalDead || 0) !== Number(arch.totalDead || 0)) return false;
    }
    return compared > 0;
}

/**
 * Verdict unique consommé par les vues : peut-on présenter les stats live comme
 * étant celles de la campagne courante ?
 *
 * @param {object} p
 * @param {*} [p.startDate] début de la campagne courante
 * @param {Array<object>} [p.liveRows] lignes live (mains + fillers)
 * @param {Map<string, object>|null} [p.archiveById] dernière archive indexée par id
 * @param {Date} [p.now]
 * @returns {boolean} false ⇒ la vue doit afficher « en attente du premier scan »
 */
export function liveStatsAreCurrent({ startDate = null, liveRows = [], archiveById = null, now = new Date() } = {}) {
    if (campaignNotStarted(startDate, now)) return false;
    if (statsMatchArchive(liveRows, archiveById)) return false;
    return true;
}

/**
 * Indexe une archive `kvk_history` (mains + fillers) par id de gouverneur.
 * @param {object|null} archive document d'archive
 * @returns {Map<string, object>|null}
 */
export function indexArchive(archive) {
    if (!archive) return null;
    const m = new Map();
    [...(archive.list || []), ...(archive.fillerList || [])].forEach((k) => m.set(String(k.id), k));
    return m;
}

export default liveStatsAreCurrent;
