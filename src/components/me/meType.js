/**
 * F-032 — échelle typographique partagée de l'espace perso « Moi ».
 *
 * Toutes les cartes de `/me` puisent leurs tailles de texte ici, pour un rendu
 * COHÉRENT d'une carte à l'autre ET fidèle au mock Claude Design, qui GRANDIT en
 * desktop (le mock « desktop 1a » utilise titres 22-30px, valeurs 16px, grand
 * nombre 22-28px, là où le mobile reste compact). D'où des variantes `lg:` : sur
 * une large colonne desktop les cartes respirent au lieu de paraître petites.
 *
 * Ce sont de simples chaînes de classes Tailwind (scannées par le content-scan)
 * — aucun CSS global, aucun impact design-system. La couleur est ajoutée au point
 * d'appel (ex. `${meType.label} text-amber-400`).
 */
export const meType = {
    // Étiquette de section mono en capitales — « NEXT ACTION », « MY KVK GOAL »…
    label: 'font-mono text-[11px] font-bold uppercase tracking-[0.14em]',
    // Titre d'accroche d'une carte (« Bochica III hasn't declared. »)
    title: 'text-lg lg:text-xl font-bold text-white leading-snug text-pretty',
    // Grand nombre hero (%, objectif)
    heroNum: 'font-mono text-2xl lg:text-3xl font-bold',
    // Libellé de cellule de grille (« Kill points », « Power »…)
    cellLabel: 'text-[11px] text-[var(--text-secondary)]',
    // Valeur de cellule (mono)
    cellValue: 'font-mono text-[15px] lg:text-base',
    // Corps de texte courant
    body: 'text-[13px] lg:text-sm leading-relaxed',
    // Méta mono (dates, compteurs « 2 Aug », « 5 / 12 »)
    meta: 'font-mono text-[11px] text-[var(--text-secondary)]',
    // Pastille (type de compte, statut)
    badge: 'text-[10px] font-bold uppercase tracking-wide',
    // Padding standard d'une carte — plus généreux en desktop (mock : 20-24px)
    cardPad: 'p-4 lg:p-5',
};

export default meType;
