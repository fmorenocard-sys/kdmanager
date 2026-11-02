/**
 * Test unitaire du repérage des soldes de la banque (BR-025), `functions/bankBalances.js`.
 *
 * Cible la logique PURE (`bankNumber`, `findBalanceHeaderRow`, `readBalanceBlock`) :
 * plusieurs tableaux empilés dans l'onglet `Dashboard` depuis le changement de banque
 * du 2997 (2026-11-02), colonnes retrouvées par libellé, cellules vides → 0.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { bankNumber, findBalanceHeaderRow, readBalanceBlock } from '../functions/bankBalances.js';

// Extrait fidèle de « KD 97 Bank Ledger »!Dashboard, mesuré le 2026-11-02 :
// l'ancienne banque (Aurion) en lignes 1-5, « Bank97 Balance Sheet » en lignes 9-13.
const DASHBOARD_2997 = [
    ['Resource', 'Total In', 'Total Out', 'Current Balance'],
    ['Food', 24322152254, 15660000000, 8339981496],
    ['Wood', 24007049776, 18404000000, 5186493386],
    ['Stone', 14735738688, 10732000000, 2668764634],
    ['Gold', 12657240091, 9850000000, 2890047641],
    [], [], [],
    ['Resource', 'Total IN', 'Total Out', 'Current Balance'],
    ['Food', 3681084985, 0, 3681084985],
    ['Wood', 3097391115, 0, 3097391115],
    ['Stone', 2306575393, 0, 2306575393],
    ['Gold', 3125484153, 0, 3125484153],
    [], [], [],
    ['ID', 'NAME', 'FOOD', 'WOOD', 'STONE', 'GOLD', 'TOTAL RSS'],
    [143595060, 'Ninii88', 2456937866, 1795023040, 1518577334, 433720806, 6204259046],
];

describe('BR-025 — repérage du tableau de soldes', () => {

    it('retient le DERNIER bloc, pas le premier (la nouvelle banque est ajoutée dessous)', () => {
        assert.equal(findBalanceHeaderRow(DASHBOARD_2997), 8);
    });

    it('lit les soldes de Bank97, pas ceux de l\'ancienne banque', () => {
        assert.deepEqual(readBalanceBlock(DASHBOARD_2997, findBalanceHeaderRow(DASHBOARD_2997)), {
            food: 3681084985, wood: 3097391115, stone: 2306575393, gold: 3125484153,
        });
    });

    it('ne déborde pas sur le tableau suivant (« Total Contribution »)', () => {
        const totals = readBalanceBlock(DASHBOARD_2997, 8);
        assert.equal(Object.values(totals).filter(v => v > 0).length, 4);
    });

    it('reste juste si l\'ancien tableau gagne ou perd des lignes', () => {
        const decale = [...DASHBOARD_2997];
        decale.splice(5, 0, ['Gems', 1, 2, 3]); // une ressource ajoutée en haut
        const idx = findBalanceHeaderRow(decale);
        assert.equal(idx, 9, 'l\'en-tête suit le décalage');
        assert.equal(readBalanceBlock(decale, idx).food, 3681084985);
    });

    it('lit un classeur à bloc unique comme avant (instances clientes inchangées)', () => {
        const mono = [
            ['Resource', 'Total In', 'Total Out', 'Current Balance'],
            ['Food', 900, 100, 800], ['Wood', 900, 100, 800],
            ['Stone', 900, 100, 800], ['Gold', 900, 100, 800],
        ];
        assert.equal(findBalanceHeaderRow(mono), 0);
        assert.deepEqual(readBalanceBlock(mono, 0), { food: 800, wood: 800, stone: 800, gold: 800 });
    });

    it('rend -1 quand la feuille ne porte aucun en-tête reconnu (repli plages figées)', () => {
        assert.equal(findBalanceHeaderRow([['Food', 1, 2, 3]]), -1);
        assert.equal(findBalanceHeaderRow([]), -1);
    });

    it('retrouve les colonnes par libellé, quelle que soit leur position', () => {
        const permute = [
            ['Resource', 'Current Balance', 'Total Out', 'Total IN'],
            ['Food', 42, 0, 42],
        ];
        assert.equal(readBalanceBlock(permute, 0).food, 42);
    });
});

describe('BR-025 — cellules vides : ni NaN ni solde négatif', () => {

    it('traite "" / null / texte comme 0', () => {
        assert.equal(bankNumber(''), 0);
        assert.equal(bankNumber(null), 0);
        assert.equal(bankNumber(undefined), 0);
        assert.equal(bankNumber('abc'), 0);
        assert.equal(bankNumber('1500'), 1500);
    });

    it('supporte un « Total Out » vide — le cas de Bank97 avant tout retrait', () => {
        const avantRetrait = [
            ['Resource', 'Total IN', 'Total Out', 'Current Balance'],
            ['Food', 3681084985, '', 3681084985],
            [],
        ];
        const totals = readBalanceBlock(avantRetrait, 0);
        assert.equal(totals.food, 3681084985);
        assert.ok(!Number.isNaN(totals.food));
    });

    it('recalcule le solde depuis Total IN − Total Out quand « Current Balance » est vide', () => {
        const sansSolde = [
            ['Resource', 'Total IN', 'Total Out', 'Current Balance'],
            ['Food', 100, '', ''],
            ['Wood', '', '', ''],
            [],
        ];
        const totals = readBalanceBlock(sansSolde, 0);
        assert.equal(totals.food, 100);
        assert.equal(totals.wood, 0);
    });

    it('borne à 0 plutôt que de rendre un solde négatif', () => {
        const incoherent = [
            ['Resource', 'Total IN', 'Total Out', 'Current Balance'],
            ['Stone', 50, 80, ''],
            [],
        ];
        assert.equal(readBalanceBlock(incoherent, 0).stone, 0);
    });
});
