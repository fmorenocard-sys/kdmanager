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
 * `kind` : 'number' | 'days' | 'text' | 'bool' | 'enum' | 'hours'
 *
 * `labelKey` : clé i18n EXISTANTE à réutiliser au lieu de `mentoring.fields.*`.
 * Les ressources et leur unité sont déjà libellées par le formulaire de
 * déclaration (`war.food` = « Nourriture (B) ») : les redéclarer ici garantirait
 * qu'elles divergent le jour où l'une des deux change. Une donnée, un libellé.
 *
 * `example` : valeur d'exemple du placeholder, même convention que la
 * déclaration (`war.example` → « ex. 5.2 »).
 *
 * `icon` / `accent` : grammaire visuelle reprise de `AvailabilityForm` — un bloc
 * = un encart `--border-flat`, un titre coloré précédé d'une icône.
 */
export const SHEET_SCHEMA = [
    {
        id: 'identity',
        icon: 'User',
        accent: 'text-sky-400',
        fields: [
            { id: 'governorId', kind: 'text', prefill: 'account', readOnly: true },
            { id: 'name', kind: 'text', prefill: 'account' },
            { id: 'power', kind: 'number', example: '95 600 000', prefill: 'players' },
            { id: 'vipLevel', kind: 'number', example: '14' },
            { id: 'mainTroopType', kind: 'enum', options: TROOP_TYPES, prefill: 'declaration' },
            { id: 'activeHoursUTC', kind: 'hours', prefill: 'declaration' },
        ],
    },
    {
        id: 'economy',
        icon: 'Database',
        accent: 'text-amber-500',
        fields: [
            // En MILLIARDS, et libellées par les mêmes clés que la déclaration —
            // un joueur lit « Nourriture (B) » au même endroit des deux formulaires.
            { id: 'food', kind: 'number', unit: 'billions', labelKey: 'war.food', example: '5.2', prefill: 'declaration' },
            { id: 'wood', kind: 'number', unit: 'billions', labelKey: 'war.wood', example: '3.1', prefill: 'declaration' },
            { id: 'stone', kind: 'number', unit: 'billions', labelKey: 'war.stone', example: '2.5', prefill: 'declaration' },
            { id: 'gold', kind: 'number', unit: 'billions', labelKey: 'war.gold', example: '1.0', prefill: 'declaration' },
            // Le brief ne justifie explicitement qu'UNE catégorie d'accélérations
            // (« les accélérateurs de soin disent combien de temps on tient ») —
            // mais les cinq coûtent cinq champs, on les garde toutes. La déclaration
            // n'en stocke qu'un total : c'est elle qui est grossière, pas l'inverse.
            { id: 'speedupUniversal', kind: 'days', example: '45' },
            { id: 'speedupConstruction', kind: 'days', example: '30' },
            { id: 'speedupResearch', kind: 'days', example: '30' },
            { id: 'speedupTraining', kind: 'days', example: '20' },
            { id: 'speedupHealing', kind: 'days', example: '60' },
            // Décision du Roi : un seul compteur au lieu de la matrice par rareté.
            { id: 'legendaryMaterials', kind: 'number', example: '120' },
            { id: 'goldenHeads', kind: 'number', example: '15' },
        ],
    },
    {
        id: 'military',
        icon: 'Swords',
        accent: 'text-red-400',
        fields: [
            // `t5Unlocked` et `hospitalCapacity` retirés le 2026-10-22 (décision du
            // Roi) : le premier se déduit de `t5Total > 0`, le second ne pilote
            // aucune décision de mentorat.
            { id: 't4Total', kind: 'number', example: '1 200 000' },
            { id: 't5Total', kind: 'number', example: '800 000' },
        ],
    },
    {
        id: 'commanders',
        icon: 'Shield',
        accent: 'text-purple-400',
        fields: [
            // Les paires de commandants sont retirées (2026-10-22) : elles vivent
            // déjà dans la déclaration de guerre, que le joueur tient à jour, et les
            // dupliquer ici créait deux sources de vérité pour la même donnée.
            // `mainTroopType` suffit à qualifier le compte.
            { id: 'equipmentLegendary', kind: 'number', example: '6' },
            { id: 'equipmentFullSets', kind: 'number', example: '1' },
            { id: 'equipmentInProgress', kind: 'number', example: '2' },
            { id: 'equipmentSpecialTalents', kind: 'number', example: '3' },
            // Remplace les listes d'objets : aucun référentiel d'équipement n'existe
            // dans l'app, et il se périmerait à chaque mise à jour du jeu.
            { id: 'missing', kind: 'text', optional: true },
        ],
    },
    {
        id: 'goal',
        icon: 'Target',
        accent: 'text-emerald-400',
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
 * Convertit une saisie en nombre, en tolérant ce que les joueurs tapent vraiment.
 *
 * Les effectifs de troupes se lisent « 800 000 » dans le jeu, et c'est ce que le
 * placeholder montre — donc c'est ce qui sera tapé, espaces compris. `Number()`
 * seul rend alors `NaN`, et le champ se viderait **en silence**. On absorbe donc
 * les séparateurs de milliers (espace, espace insécable, espace fine insécable,
 * apostrophe) et la virgule décimale.
 *
 * Retourne `null` — jamais `0` — pour une saisie vide ou inexploitable : « je
 * n'ai pas répondu » doit rester distinct de « je n'ai rien ».
 *
 * @param {string|number|null} raw
 * @returns {number|null}
 */
export function parseNumeric(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    const cleaned = String(raw)
        .replace(/[\s\u00a0\u202f\u2009']/g, '')
        .replace(',', '.');
    if (cleaned === '') return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

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
        for (const f of b.fields) blocks[b.id][f.id] = null;
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
