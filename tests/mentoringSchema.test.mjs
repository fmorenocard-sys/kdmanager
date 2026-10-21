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
    assert.deepEqual(blocks.commanders.pairs, []);
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
            blocks[b.id][f.id] = f.kind === 'pairs' ? [{ type: 'Infantry' }] : 1;
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
    b.military.t5Unlocked = true;
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
