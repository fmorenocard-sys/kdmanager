// Schéma de la fiche de mentorat (src/lib/mentoringSchema.js) — E-010 / F-039.
// Pur, donc testable sans émulateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    SHEET_SCHEMA, ALL_FIELDS, isFilled, blockState, completeness, emptySheet, diffSheets,
} from '../src/lib/mentoringSchema.js';

test('le schéma reste court — c\'est la promesse du MVP', () => {
    // Le brief demandait ~80 points de données ; l'arbitrage du Roi les ramène
    // sous 30. Si ce test casse, c'est que la fiche a regrossi sans décision.
    assert.ok(ALL_FIELDS.length <= 30, `trop de champs : ${ALL_FIELDS.length}`);
    assert.equal(SHEET_SCHEMA.length, 5);
});

test('les deux blocs matriciels sont bien réduits à un compteur chacun', () => {
    const ids = ALL_FIELDS.map((f) => f.id);
    assert.ok(ids.includes('legendaryMaterials'), 'matériaux légendaires attendus');
    assert.ok(ids.includes('goldenHeads'), 'têtes d\'or attendues');
    // Aucune matrice par rareté ni par commandant ne doit réapparaître.
    assert.ok(!ids.some((i) => /rarity|epic|silver|sculpture/i.test(i)));
});

test('les champs retirés le 2026-10-22 ne reviennent pas par inadvertance', () => {
    // Decision du Roi : langues parlees, capacite d'hopital, T5 debloque et paires
    // de commandants sont hors fiche. Les deux premiers ne pilotent aucune decision
    // de mentorat ; `t5Unlocked` se deduit de `t5Total > 0` ; les paires vivent deja
    // dans la declaration de guerre, seule source de verite.
    const ids = ALL_FIELDS.map((f) => f.id);
    for (const retire of ['languages', 'hospitalCapacity', 't5Unlocked', 'pairs']) {
        assert.ok(!ids.includes(retire), `champ retire reapparu : ${retire}`);
    }
    assert.ok(ids.includes('equipmentSpecialTalents'));
});

test('isFilled — 0 est une RÉPONSE, pas une absence de réponse', () => {
    // C'est le piège d'AvailabilityForm, dont les défauts à 0 rendent
    // « je n'ai rien » indiscernable de « je n'ai pas répondu ».
    assert.equal(isFilled(0), true);
    assert.equal(isFilled(false), true);
    assert.equal(isFilled(null), false);
    assert.equal(isFilled(undefined), false);
    assert.equal(isFilled(''), false);
    assert.equal(isFilled('   '), false);
    assert.equal(isFilled([]), false);
    assert.equal(isFilled([{ type: 'Infantry' }]), true);
    assert.equal(isFilled({ from: '', to: '' }), false);
    assert.equal(isFilled({ from: '20:00', to: '23:00' }), true);
});

test('emptySheet — tout part à null, jamais à 0', () => {
    const blocks = emptySheet();
    assert.deepEqual(blocks.economy.goldenHeads, null);
    assert.deepEqual(blocks.military.t4Total, null);
    assert.deepEqual(blocks.commanders.equipmentSpecialTalents, null);
    const { done, percent } = completeness(blocks);
    assert.equal(done, 0);
    assert.equal(percent, 0);
});

test('blockState — todo / doing / done', () => {
    const economy = SHEET_SCHEMA.find((b) => b.id === 'economy');
    assert.equal(blockState({}, economy), 'todo');
    assert.equal(blockState({ food: 12 }, economy), 'doing');
    const complet = {};
    for (const f of economy.fields) complet[f.id] = 0;
    assert.equal(blockState(complet, economy), 'done', '0 partout = bloc rempli');
});

test('completeness — liste ce qui manque, bloc par champ (B4)', () => {
    const blocks = emptySheet();
    blocks.goal.playerGoal = 'Monter Charlemagne';
    const { done, total, missing } = completeness(blocks);
    assert.equal(done, 1);
    assert.ok(total > 20 && total <= 30);
    assert.ok(!missing.some((m) => m.field === 'playerGoal'));
    assert.ok(missing.some((m) => m.block === 'economy' && m.field === 'speedupHealing'));
});

test('completeness — un champ optionnel ne bloque jamais la complétude', () => {
    const blocks = emptySheet();
    for (const b of SHEET_SCHEMA) {
        for (const f of b.fields) {
            if (f.optional || f.readOnly) continue;
            blocks[b.id][f.id] = 1;
        }
    }
    const { percent, missing } = completeness(blocks);
    assert.equal(percent, 1, `incomplet alors que tout le requis est rempli : ${JSON.stringify(missing)}`);
});

test('diffSheets — compare en profondeur sans connaître les champs (B8)', () => {
    const a = emptySheet();
    const b = emptySheet();
    a.economy.goldenHeads = 10;
    b.economy.goldenHeads = 25;
    b.commanders.equipmentSpecialTalents = 3;
    const d = diffSheets(a, b);
    assert.equal(d.length, 2);
    assert.deepEqual(d.find((x) => x.field === 'goldenHeads'), {
        block: 'economy', field: 'goldenHeads', from: 10, to: 25,
    });
});

test('diffSheets — deux versions identiques ne produisent aucune ligne', () => {
    const a = emptySheet();
    assert.deepEqual(diffSheets(a, emptySheet()), []);
});

test('chaque champ porte un id unique — l\'export et l\'i18n en dépendent', () => {
    const ids = ALL_FIELDS.map((f) => `${f.block}.${f.id}`);
    assert.equal(new Set(ids).size, ids.length);
});

test('le pré-remplissage ne s\'appuie que sur des sources réellement disponibles', () => {
    // Mesuré sur 2997 : 123/143 déclarations portent resources, speedups et marches.
    const sources = new Set(ALL_FIELDS.map((f) => f.prefill).filter(Boolean));
    assert.deepEqual([...sources].sort(), ['account', 'declaration', 'players']);
});

// ── Couverture i18n ───────────────────────────────────────────────────────────
// Le smoke test de rendu ne peut PAS couvrir ça : le formulaire ne rend que
// l'étape courante, donc les libellés des autres étapes n'apparaissent jamais
// dans son markup (vérifié en retirant `mentoring.blocks.economy` — il restait
// vert). Le contrôle doit donc se faire sur le schéma, pas sur le rendu.
import { readFileSync } from 'node:fs';

const LOCALES = ['fr', 'en', 'es', 'de', 'it', 'pl', 'tr', 'uk', 'vi', 'ar'];
const load = (l) => JSON.parse(readFileSync(new URL(`../src/locales/${l}/translation.json`, import.meta.url), 'utf8'));

test('chaque champ du schéma a un libellé dans LES 10 locales', () => {
    const manquantes = [];
    for (const loc of LOCALES) {
        const m = load(loc).mentoring;
        if (!m) { manquantes.push(`${loc}: bloc mentoring absent`); continue; }
        for (const block of SHEET_SCHEMA) {
            if (!m.blocks?.[block.id]) manquantes.push(`${loc}: mentoring.blocks.${block.id}`);
            for (const f of block.fields) {
                if (!m.fields?.[block.id]?.[f.id]) manquantes.push(`${loc}: mentoring.fields.${block.id}.${f.id}`);
            }
        }
    }
    assert.deepEqual(manquantes, [], `clés i18n manquantes :\n${manquantes.join('\n')}`);
});

test('les libellés d\'étapes et les textes d\'interface existent partout', () => {
    const requis = ['title', 'card_title', 'card_todo', 'card_start', 'progress_title', 'finish',
        'saving', 'saved', 'save_error', 'not_set', 'on_behalf_notice', 'fill_for', 'entered_by'];
    const manquantes = [];
    for (const loc of LOCALES) {
        const j = load(loc);
        for (const k of requis) if (!j.mentoring?.[k]) manquantes.push(`${loc}: mentoring.${k}`);
        for (const s of ['identity', 'economy', 'military', 'commanders']) {
            if (!j.mentoring?.steps?.[s]) manquantes.push(`${loc}: mentoring.steps.${s}`);
        }
        for (const k of ['yes', 'no', 'previous', 'next']) {
            if (!j.common?.[k]) manquantes.push(`${loc}: common.${k}`);
        }
    }
    assert.deepEqual(manquantes, [], `clés i18n manquantes :\n${manquantes.join('\n')}`);
});

test('les clés de l\'écran de suivi du Conseil existent partout (B10/B11)', () => {
    const requis = ['tab_label', 'tracking_title', 'tracking_hint', 'tracking_empty', 'tracking_error',
        'state_todo', 'state_doing', 'state_done', 'col_player', 'col_state', 'col_progress',
        'col_entered_by', 'col_updated', 'open_sheet', 'out_of_scope'];
    const manquantes = [];
    for (const loc of LOCALES) {
        const m = load(loc).mentoring || {};
        for (const k of requis) if (!m[k]) manquantes.push(`${loc}: mentoring.${k}`);
    }
    assert.deepEqual(manquantes, [], `clés i18n manquantes :\n${manquantes.join('\n')}`);
});
