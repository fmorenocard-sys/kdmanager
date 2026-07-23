/**
 * Test de parité front / Functions (F-014).
 *
 * `functions/` est un paquet séparé et ne peut pas importer depuis `src/` : la
 * logique des objectifs y est donc dupliquée. Ce test est le garde-fou — il
 * balaie les puissances et casse dès que les deux implémentations divergent,
 * de sorte qu'une correction appliquée d'un seul côté ne passe pas inaperçue.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as front from '../src/lib/kvkGoals.js';
import * as back from '../functions/kvkGoals.js';
import * as frontScoring from '../src/lib/kvkScoring.js';

describe('parité src/lib/kvkGoals.js ↔ functions/kvkGoals.js', () => {

    it('produit les mêmes objectifs sur tout le domaine utile', () => {
        for (let mp = 1; mp <= 200; mp += 0.5) {
            const power = mp * 1e6;
            const a = front.computeKvkGoals(power);
            const b = back.computeKvkGoals(power);
            for (const key of ['minKp', 'goalKp', 'minDead', 'minDeadApproxTroops', 'minDkpRatio', 'powerM']) {
                assert.equal(a[key], b[key], `divergence sur ${key} à ${mp} M`);
            }
            assert.equal(a.outOfDomain, b.outOfDomain, `outOfDomain à ${mp} M`);
            assert.equal(a.outsideValidatedRange, b.outsideValidatedRange, `outsideValidatedRange à ${mp} M`);
        }
    });

    it('produit les mêmes objectifs DKP quand Req DKP est fourni', () => {
        for (const mp of [40, 60, 80, 120]) {
            const a = front.computeKvkGoals(mp * 1e6, { reqDkp: 1234 });
            const b = back.computeKvkGoals(mp * 1e6, { reqDkp: 1234 });
            assert.deepEqual([a.minDkp, a.goalDkp], [b.minDkp, b.goalDkp], `DKP à ${mp} M`);
        }
    });

    it('classe identiquement sur toute la plage de taux d\'atteinte', () => {
        for (let pct = 0; pct <= 2.5; pct += 0.01) {
            const a = frontScoring.rateFromGoalPct(pct);
            const b = back.rateFromGoalPct(pct);
            assert.equal(a.rate, b.rate, `rate à ${(pct * 100).toFixed(0)} %`);
            assert.equal(a.uncertain, b.uncertain, `uncertain à ${(pct * 100).toFixed(0)} %`);
        }
    });

    it('partage les mêmes constantes', () => {
        assert.equal(front.DOMAIN_MIN_MPOWER, back.DOMAIN_MIN_MPOWER);
        assert.equal(front.DEAD_POINTS_PER_T5, back.DEAD_POINTS_PER_T5);
        assert.deepEqual(frontScoring.RATE_THRESHOLDS, back.RATE_THRESHOLDS);
        assert.deepEqual(frontScoring.EXCELLENT_FUZZY_BAND, back.EXCELLENT_FUZZY_BAND);
    });
});
