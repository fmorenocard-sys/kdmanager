/**
 * sortRows.js — tri de tableau partagé (F-019 / F-020).
 *
 * Extrait de la vue Joueurs pour être réutilisé par le classement des Royaumes :
 * les deux tables ont les mêmes attentes, et une seule règle de tri évite qu'elles
 * divergent au premier ajout de colonne.
 *
 * Deux invariants :
 *  - **les valeurs manquantes finissent toujours en bas**, dans les deux sens.
 *    Un tri croissant sur la puissance qui remonterait les profils incomplets en
 *    tête ne répond à aucune question réelle ;
 *  - le texte se compare avec localeCompare (accents, casse), les nombres
 *    numériquement — jamais de comparaison lexicographique sur des entiers.
 */

/** Compare deux valeurs selon le sens demandé, valeurs nulles en dernier. */
export function compareValues(va, vb, dir = 'desc') {
    const factor = dir === 'asc' ? 1 : -1;
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string' || typeof vb === 'string') {
        return String(va).localeCompare(String(vb)) * factor;
    }
    return (va - vb) * factor;
}

/**
 * Trie une copie du tableau sur une clé.
 * @param {Array<object>} rows lignes à trier
 * @param {{key: string, dir: 'asc'|'desc'}} sort état de tri
 * @returns {Array<object>} nouveau tableau trié
 */
export function sortRows(rows, { key, dir }) {
    if (!key) return rows;
    return [...rows].sort((a, b) => compareValues(a[key], b[key], dir));
}

/**
 * Réducteur d'état de tri : re-cliquer une colonne inverse le sens, changer de
 * colonne repart en décroissant (ce qu'on veut 9 fois sur 10 sur des scores).
 * @param {{key: string, dir: string}} prev état courant
 * @param {string} key colonne cliquée
 * @returns {{key: string, dir: string}} nouvel état
 */
export function nextSort(prev, key) {
    return prev.key === key
        ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: 'desc' };
}
