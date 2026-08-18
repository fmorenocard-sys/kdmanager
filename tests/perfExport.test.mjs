/**
 * Test unitaire du mapping F-036 (scan → static_data/kvk), `functions/kvkRace/perfExport.js`.
 *
 * Cible la logique PURE (`refreshPerformanceList`, `indexScanRows`) : préservation de la
 * référence figée, mapping des colonnes brutes (BR-010), dégradation propre, calcul objectif.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { refreshPerformanceList, indexScanRows } from '../functions/kvkRace/perfExport.js';
import { computeKvkGoals } from '../functions/kvkGoals.js';

describe('F-036 — refreshPerformanceList', () => {

    it('rafraîchit un gouverneur présent dans le scan sans toucher la référence figée', () => {
        const existing = [{ id: '111', name: 'Alpha', initialPower: 100e6, initialKp: 500e6, finalPower: 100e6 }];
        const scanByGov = new Map([['111', {
            governor_id: 111, kingdom: 3341, scan_seq: 4,
            latest_power: 92e6, dead_diff: 597651, kill_points_diff: 120e6,
        }]]);

        const { list, refreshed } = refreshPerformanceList(existing, scanByGov);
        assert.equal(refreshed, 1);
        const p = list[0];
        // Référence figée intacte
        assert.equal(p.initialPower, 100e6, 'initialPower préservé (jamais recalculé)');
        assert.equal(p.initialKp, 500e6, 'initialKp préservé');
        // Colonnes brutes du scan (BR-010)
        assert.equal(p.totalDead, 597651, 'totalDead ← dead_diff');
        assert.equal(p.totalKpGained, 120e6, 'totalKpGained ← kill_points_diff');
        assert.equal(p.finalPower, 92e6, 'finalPower ← latest_power');
        assert.equal(p.totalPowerDiff, 92e6 - 100e6, 'totalPowerDiff = finalPower − initialPower');
        assert.equal(p.finalKp, 500e6 + 120e6, 'finalKp = initialKp + totalKpGained');
        // Objectif recalculé via kvkGoals
        const goalKp = computeKvkGoals(100e6).goalKp;
        assert.equal(p.goalPercent, 120e6 / (goalKp * 1e6), 'goalPercent = totalKpGained / (goalKp·1e6)');
        assert.ok(typeof p.rate === 'string' && p.rate.length, 'rate calculé');
    });

    it('laisse un gouverneur ABSENT du scan strictement inchangé (jamais 0 trompeur)', () => {
        const original = { id: '222', name: 'Beta', initialPower: 80e6, initialKp: 300e6, finalPower: 79e6, totalDead: 42 };
        const { list, refreshed } = refreshPerformanceList([original], new Map());
        assert.equal(refreshed, 0);
        assert.deepEqual(list[0], original, 'ligne inchangée');
        assert.equal(list[0].totalPowerDiff, undefined, 'aucun champ dérivé ajouté');
    });

    it('power diff négatif conservé (perte de puissance en combat)', () => {
        const existing = [{ id: '333', initialPower: 100e6, initialKp: 0 }];
        const scanByGov = new Map([['333', { governor_id: 333, kingdom: 1, scan_seq: 2, latest_power: 90e6, dead_diff: 0, kill_points_diff: 0 }]]);
        const { list } = refreshPerformanceList(existing, scanByGov);
        assert.equal(list[0].totalPowerDiff, -10e6, 'négatif préservé');
    });
});

describe('F-036 — indexScanRows', () => {
    const players = [
        { governor_id: 1, kingdom: 3341, scan_seq: 4, latest_power: 10 },
        { governor_id: 2, kingdom: 9999, scan_seq: 4, latest_power: 20 }, // autre royaume
        { governor_id: 3, kingdom: 3341, scan_seq: 3, latest_power: 30 }, // scan antérieur
        { governor_id: 1, kingdom: 3341, scan_seq: 4, latest_power: 99 }, // doublon → ignoré
        { governor_id: null, kingdom: 3341, scan_seq: 4, latest_power: 40 }, // id nul → ignoré
    ];

    it('filtre par royaume + séquence, garde la première occurrence', () => {
        const idx = indexScanRows(players, 3341, 4);
        assert.equal(idx.size, 1, 'seul le gouverneur 1 du royaume 3341 au scan 4');
        assert.equal(idx.get('1').latest_power, 10, 'première occurrence conservée');
        assert.equal(idx.has('2'), false, 'autre royaume exclu');
        assert.equal(idx.has('3'), false, 'scan antérieur exclu');
    });
});
