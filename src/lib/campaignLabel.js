// campaignLabel.js — résout le LIBELLÉ d'affichage d'une campagne KvK de façon cohérente
// entre les écrans.
//
// Problème : le nom de campagne est dénormalisé sans source unique.
//  - `war_availabilities.kvkName` : nom FIGÉ sur chaque déclaration (au nom de la config
//    à l'instant de la déclaration — souvent un placeholder, ex. « SoC 4 - TDB »).
//  - `kvk_history.title` : titre FINAL saisi à l'archivage (ex. « SoC 4: King of All Britain (2026) »).
// Résultat : le War Tracker (qui lit les déclarations) et la Performance (qui lit l'archive)
// affichaient deux noms différents pour la même campagne.
//
// Il n'y a PAS d'ID commun joignable : `kvk_history` est clé-é sur `slugify(title)` (titre final),
// alors que la déclaration porte le `kvkId` de l'époque (nom d'alors). La jointure fiable qui
// reste des deux côtés est le **numéro de saison « SoC N »**. On privilégie donc le titre
// d'archive quand on peut le rattacher, sinon on retombe sur le nom figé (comportement actuel).

// Extrait un jeton de saison normalisé « socN » d'un libellé (« SoC 4 - TDB », « SoC 4: … » → « soc4 »).
const seasonToken = (s) => {
    const m = String(s || '').match(/soc\s*[-:]?\s*(\d+)/i);
    return m ? `soc${m[1]}` : null;
};

/**
 * @param {string} kvkId   id de la campagne (config/déclaration)
 * @param {string} kvkName nom figé (déclaration) ou nom de config courant
 * @param {Array<{id:string,title:string}>} historyDocs docs kvk_history ({id, title})
 * @returns {string} le meilleur libellé d'affichage
 */
export function resolveCampaignName(kvkId, kvkName, historyDocs = []) {
    const fallback = kvkName || kvkId || '';
    if (!Array.isArray(historyDocs) || historyDocs.length === 0) return fallback;

    // 1. Jointure directe par docId (cas où le nom n'a pas changé entre l'actif et l'archive).
    const byId = historyDocs.find((h) => h && h.id && h.id === kvkId);
    if (byId && byId.title) return byId.title;

    // 2. Jointure par numéro de saison « SoC N » (couvre les renommages : TDB → King of All Britain).
    const tok = seasonToken(kvkName);
    if (tok) {
        const bySeason = historyDocs.find((h) => h && seasonToken(h.title) === tok);
        if (bySeason && bySeason.title) return bySeason.title;
    }

    // 3. Repli : le nom figé de la déclaration (comportement d'origine).
    return fallback;
}
