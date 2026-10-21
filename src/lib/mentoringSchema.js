/**
 * mentoringSchema.js — E-010 / F-039 : la fiche d'état de compte, décrite UNE fois.
 *
 * Ce schéma pilote tout ce qui dépend de la liste des champs : le rendu du
 * formulaire, le calcul de complétude (B4), la comparaison de deux versions (B8),
 * l'export (B14) et les clés i18n. Ajouter un champ ici le fait apparaître partout,
 * sans toucher un écran — c'est ce qui rend la fiche extensible sans dette.
 *
 * ── Ce qui a été coupé, et pourquoi ────────────────────────────────────────────
 * Le brief d'Helios demandait ~80 points de données, dont deux blocs matriciels :
 * matériaux « par rareté » (4 matières × ~5 raretés) et têtes « sculptures des
 * commandants clés » (un compteur par commandant). À eux deux, plus de la moitié
 * de la saisie — et la moins décisionnelle : un mentor ne fixe pas un objectif sur
 * « 1 240 cuirs épiques », il dit « monte Charlemagne à 5-5-1-1 ».
 *
 * Arbitrage du Roi (2026-10-21) : on ne les supprime pas, on les RÉDUIT à ce qui
 * porte le signal — `legendaryMaterials` et `goldenHeads`, un nombre chacun.
 * ~30 champs deviennent 2, le mentor garde l'information qui l'intéresse.
 *
 * ── `null` n'est pas `0` ───────────────────────────────────────────────────────
 * Le piège de `AvailabilityForm` est ses valeurs par défaut à 0 : impossible d'y
 * distinguer « je n'ai rien » de « je n'ai pas répondu ». Ici tout part à `null`,
 * et la complétude se calcule là-dessus.
 *
 * Volontairement PUR (aucun import React ni Firebase) : testable sans émulateur,
 * même parti pris que `kvkGoals.js` et `campaignFreshness.js`.
 */

/** Types de troupes du jeu, ordre d'affichage. */
export const TROOP_TYPES = ['Infantry', 'Cavalry', 'Archer', 'Siege'];

/**
 * Les blocs de la fiche. `prefill` nomme la source de pré-remplissage quand elle
 * existe — mesuré sur 2997 : 123 des 143 déclarations portent déjà `resources`,
 * `speedups.total` et les paires de commandants.
 *
 * `kind` : 'number' | 'days' | 'text' | 'bool' | 'enum' | 'pairs' | 'hours'
 */
export const SHEET_SCHEMA = [
    {
        id: 'identity',
        fields: [
            { id: 'governorId', kind: 'text', prefill: 'account', readOnly: true },
            { id: 'name', kind: 'text', prefill: 'account' },
            { id: 'power', kind: 'number', prefill: 'players' },
            { id: 'vipLevel', kind: 'number' },
            { id: 'mainTroopType', kind: 'enum', options: TROOP_TYPES, prefill: 'declaration' },
            { id: 'activeHoursUTC', kind: 'hours', prefill: 'declaration' },
            { id: 'languages', kind: 'text' },
        ],
    },
    {
        id: 'economy',
        fields: [
            { id: 'food', kind: 'number', unit: 'millions', prefill: 'declaration' },
            { id: 'wood', kind: 'number', unit: 'millions', prefill: 'declaration' },
            { id: 'stone', kind: 'number', unit: 'millions', prefill: 'declaration' },
            { id: 'gold', kind: 'number', unit: 'millions', prefill: 'declaration' },
            // Le brief ne justifie explicitement qu'UNE catégorie d'accélérateurs
            // (« les accélérateurs de soin disent combien de temps on tient ») —
            // mais les cinq coûtent cinq champs, on les garde toutes.
            { id: 'speedupUniversal', kind: 'days' },
            { id: 'speedupConstruction', kind: 'days' },
            { id: 'speedupResearch', kind: 'days' },
            { id: 'speedupTraining', kind: 'days' },
            { id: 'speedupHealing', kind: 'days' },
            // Décision du Roi : un seul compteur au lieu de la matrice par rareté.
            { id: 'legendaryMaterials', kind: 'number' },
            { id: 'goldenHeads', kind: 'number' },
        ],
    },
    {
        id: 'military',
        fields: [
            { id: 't5Unlocked', kind: 'bool' },
            { id: 't4Total', kind: 'number' },
            { id: 't5Total', kind: 'number' },
            { id: 'hospitalCapacity', kind: 'number' },
        ],
    },
    {
        id: 'commanders',
        fields: [
            // Une paire par type de troupe, reprise de la dernière déclaration.
            { id: 'pairs', kind: 'pairs', prefill: 'declaration' },
            { id: 'equipmentLegendary', kind: 'number' },
            { id: 'equipmentFullSets', kind: 'number' },
            { id: 'equipmentInProgress', kind: 'number' },
            // Remplace les listes d'objets : aucun référentiel d'équipement n'existe
            // dans l'app, et il se périmerait à chaque mise à jour du jeu.
            { id: 'missing', kind: 'text', optional: true },
        ],
    },
    {
        id: 'goal',
        fields: [
            { id: 'playerGoal', kind: 'text' },
        ],
    },
];

/** Tous les champs, à plat — pour l'export et la comparaison. */
export const ALL_FIELDS = SHEET_SCHEMA.flatMap((b) => b.fields.map((f) => ({ ...f, block: b.id })));

/** Champs qui comptent pour la complétude (les `optional` n'y entrent pas). */
const requiredFields = (block) => block.fields.filter((f) => !f.optional && !f.readOnly);

/**
 * Une valeur est-elle renseignée ? `null`/`undefined`/chaîne vide = non.
 * **0 est une réponse valide** — « je n'ai aucun accélérateur » est une information.
 * @param {*} v
 * @returns {boolean}
 */
export function isFilled(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.values(v).some(isFilled);
    return true;
}

/**
 * État d'un bloc : 'todo' | 'doing' | 'done'.
 * @param {object} blockValues valeurs du bloc
 * @param {object} block définition du bloc
 * @returns {string}
 */
export function blockState(blockValues, block) {
    const req = requiredFields(block);
    if (!req.length) return 'done';
    const filled = req.filter((f) => isFilled((blockValues || {})[f.id])).length;
    if (filled === 0) return 'todo';
    return filled === req.length ? 'done' : 'doing';
}

/**
 * Complétude de la fiche entière (B4 : « voir ce qui manque »).
 * @param {object} blocks `sheet.blocks`
 * @returns {{done: number, total: number, percent: number, missing: Array<{block: string, field: string}>}}
 */
export function completeness(blocks) {
    const missing = [];
    let done = 0; let total = 0;
    for (const block of SHEET_SCHEMA) {
        for (const f of requiredFields(block)) {
            total++;
            if (isFilled((blocks || {})[block.id]?.[f.id])) done++;
            else missing.push({ block: block.id, field: f.id });
        }
    }
    return { done, total, percent: total ? done / total : 0, missing };
}

/** Squelette vide — tout à `null`, jamais à 0 (cf. en-tête). */
export function emptySheet() {
    const blocks = {};
    for (const b of SHEET_SCHEMA) {
        blocks[b.id] = {};
        for (const f of b.fields) blocks[b.id][f.id] = f.kind === 'pairs' ? [] : null;
    }
    return blocks;
}

/**
 * Différences entre deux versions (B8 : « comparer deux fiches dans le temps »).
 * Générique : dérive du schéma, donc un nouveau champ est comparé sans code neuf.
 * @param {object} a blocs de la version la plus ancienne
 * @param {object} b blocs de la plus récente
 * @returns {Array<{block: string, field: string, from: *, to: *}>}
 */
export function diffSheets(a, b) {
    const out = [];
    for (const { block, id } of ALL_FIELDS) {
        const from = (a || {})[block]?.[id] ?? null;
        const to = (b || {})[block]?.[id] ?? null;
        if (JSON.stringify(from) !== JSON.stringify(to)) out.push({ block, field: id, from, to });
    }
    return out;
}
