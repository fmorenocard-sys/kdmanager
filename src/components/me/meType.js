/**
 * F-032 — échelle typographique partagée de l'espace perso « Moi ».
 *
 * Toutes les cartes de `/me` puisent leurs tailles de texte ici, pour un rendu
 * COHÉRENT d'une carte à l'autre (calé sur le mock Claude Design « desktop 1a » :
 * étiquettes 11px mono, corps 13-14px, valeurs 15px, grand nombre 24px, pastilles
 * 10px). Ce sont de simples chaînes de classes Tailwind (scannées par le
 * content-scan) — aucun CSS global, aucun impact design-system.
 *
 * Convention : ces tokens fixent la TAILLE/graisse/espacement ; la couleur est
 * ajoutée au point d'appel (ex. `${meType.label} text-amber-400`).
 */
export const meType = {
    // Étiquette de section mono en capitales — « NEXT ACTION », « MY KVK GOAL »…
    label: 'font-mono text-[11px] font-bold uppercase tracking-[0.14em]',
    // Titre d'accroche d'une carte (« Bochica III hasn't declared. »)
    title: 'text-lg font-bold text-white leading-snug text-pretty',
    // Grand nombre hero (%, objectif)
    heroNum: 'font-mono text-2xl font-bold',
    // Libellé de cellule de grille (« Kill points », « Power »…)
    cellLabel: 'text-[11px] text-[var(--text-secondary)]',
    // Valeur de cellule (mono)
    cellValue: 'font-mono text-[15px]',
    // Corps de texte courant
    body: 'text-[13px] leading-relaxed',
    // Méta mono (dates, compteurs « 2 Aug », « 5 / 12 »)
    meta: 'font-mono text-[11px] text-[var(--text-secondary)]',
    // Pastille (type de compte, statut)
    badge: 'text-[10px] font-bold uppercase tracking-wide',
};

export default meType;
