/**
 * Tests du calculateur d'objectifs KvK (F-014 / US-009).
 *
 *   node --test tests/kvkGoals.test.mjs
 *
 * Les valeurs de référence viennent du classeur SoC 4 réel (onglets « Dashboard »
 * et « Performance Analysis »), pas d'un calcul refait à la main : c'est ce qui
 * rend ces tests utiles. Si quelqu'un « corrige » un coefficient, ils cassent.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeKvkGoals, minDkpRatio, resolveReqDkp, DOMAIN_MIN_MPOWER, DEAD_POINTS_PER_T5 } from '../src/lib/kvkGoals.js';

// Lord Guineapig — SoC 4, le joueur affiché sur l'onglet Dashboard du classeur.
const GUINEAPIG = {
    initialPower: 117965143,
    dashboardMinKp: 597.4e6,      // « KP Minimal Requirement » lu dans le classeur
    perfAnalysisGoalKp: 859.99e6  // KP gagnés / % Goal
};

const closeTo = (actual, expected, tolerance, label) => {
    const delta = Math.abs(actual - expected) / expected;
    assert.ok(delta <= tolerance,
        `${label} : ${actual} vs ${expected} attendu (écart ${(delta * 100).toFixed(3)} %)`);
};

describe('computeKvkGoals — validé contre le classeur SoC 4', () => {

    it('reproduit le KP minimum affiché par le classeur (Lord Guineapig, 118 M)', () => {
        const g = computeKvkGoals(GUINEAPIG.initialPower);
        closeTo(g.minKp * 1e6, GUINEAPIG.dashboardMinKp, 0.001, 'minKp');
    });

    it('reproduit le KP Goal reconstitué depuis % Goal', () => {
        const g = computeKvkGoals(GUINEAPIG.initialPower);
        closeTo(g.goalKp * 1e6, GUINEAPIG.perfAnalysisGoalKp, 0.001, 'goalKp');
    });

    it('exprime la puissance en millions et le KP en millions', () => {
        const g = computeKvkGoals(117965143);
        closeTo(g.powerM, 117.965, 0.001, 'powerM');
        assert.ok(g.minKp > 500 && g.minKp < 700, 'minKp doit être en millions, pas en unités brutes');
    });
});

describe('garde-fous numériques', () => {

    it('ne renvoie jamais de morts négatives (la courbe brute passe sous zéro à 32,7 M)', () => {
        for (const p of [1e6, 10e6, 20e6, 30e6, 32e6]) {
            assert.ok(computeKvkGoals(p).minDead >= 0, `minDead négatif à ${p / 1e6} M`);
        }
    });

    it('ne renvoie jamais de KP Goal négatif (la courbe brute passe sous zéro à 14,5 M)', () => {
        for (const p of [1e6, 5e6, 10e6, 14e6]) {
            assert.ok(computeKvkGoals(p).goalKp >= 0, `goalKp négatif à ${p / 1e6} M`);
        }
    });

    it('l\'exigence de KP ne remonte jamais quand la puissance baisse', () => {
        let previous = Infinity;
        for (let mp = 200; mp >= 1; mp -= 1) {
            const { minKp } = computeKvkGoals(mp * 1e6);
            assert.ok(minKp <= previous + 1e-9,
                `minKp remonte à ${mp} M : ${minKp} après ${previous}`);
            previous = minKp;
        }
    });

    it('signale les puissances hors du domaine de validité', () => {
        assert.equal(computeKvkGoals(10e6).outOfDomain, true);
        assert.equal(computeKvkGoals(80e6).outOfDomain, false);
        assert.equal(computeKvkGoals(10e6).outsideValidatedRange, true);
        assert.equal(computeKvkGoals(200e6).outsideValidatedRange, true);
        assert.equal(computeKvkGoals(80e6).outsideValidatedRange, false);
    });

    it('reproduit le % Min Dead du classeur (morts en points, pas en têtes)', () => {
        // Lord Guineapig : 3 262 800 morts, % Min Dead affiché 2,4212
        const g = computeKvkGoals(GUINEAPIG.initialPower);
        const pct = (3262800 * DEAD_POINTS_PER_T5) / (g.minDead * 1e6);
        closeTo(pct, 2.4212, 0.001, '% Min Dead');
    });

    it('convertit les points de morts en ordre de grandeur de troupes', () => {
        const g = computeKvkGoals(GUINEAPIG.initialPower);
        closeTo(g.minDeadApproxTroops, 1347700, 0.01, 'morts approximatives');
    });

    it('applique le plafond de puissance quand il est fourni', () => {
        const capped = computeKvkGoals(200e6, { capMPower: 120 });
        const reference = computeKvkGoals(120e6);
        assert.equal(capped.capped, true);
        closeTo(capped.minKp, reference.minKp, 1e-9, 'minKp plafonné');
    });

    it('gèle la courbe au sommet sous le seuil de domaine', () => {
        const atVertex = computeKvkGoals(DOMAIN_MIN_MPOWER * 1e6).minKp;
        closeTo(computeKvkGoals(5e6).minKp, atVertex, 1e-9, 'minKp sous le seuil');
    });
});

describe('paliers et Req DKP', () => {

    it('applique les paliers de DKP minimum de l\'étude', () => {
        assert.equal(minDkpRatio(40), 0.25);
        assert.equal(minDkpRatio(49.9), 0.25);
        assert.equal(minDkpRatio(50), 0.35);
        assert.equal(minDkpRatio(70), 0.35);
        assert.equal(minDkpRatio(70.1), 0.45);
    });

    it('ne calcule aucun objectif DKP tant que Req DKP n\'est pas configuré (A-005)', () => {
        const g = computeKvkGoals(80e6);
        assert.equal(g.dkpAvailable, false);
        assert.equal(g.minDkp, null);
        assert.equal(g.goalDkp, null);
    });

    it('calcule les objectifs DKP dès que Req DKP est fourni', () => {
        const g = computeKvkGoals(80e6, { reqDkp: 1000 });
        assert.equal(g.dkpAvailable, true);
        assert.equal(g.minDkp, 450);   // palier 45 % au-dessus de 70 M
        assert.equal(g.goalDkp, 2000); // Req DKP × 200 %
    });

    it('résout Req DKP selon le mode configuré', () => {
        assert.equal(resolveReqDkp({ reqDkpMode: 'constant', reqDkpValue: 500 }, 80), 500);
        assert.equal(resolveReqDkp({ reqDkpMode: 'per_mpower', reqDkpValue: 10 }, 80), 800);
        assert.equal(resolveReqDkp({ reqDkpValue: 0 }, 80), null);
        assert.equal(resolveReqDkp(null, 80), null);
    });
});

// ---------------------------------------------------------------------------
// Notation (kvkScoring) — valeurs de référence relevées sur les 47 joueurs notés
// de SoC 4 : Dead Weight 0–15 %, Need Improvement 17–25 %, Good 29–64 %,
// Excellent 56–201 %.
// ---------------------------------------------------------------------------

import { rateFromGoalPct, scaleTo10, RATES, EXCELLENT_FUZZY_BAND } from '../src/lib/kvkScoring.js';

describe('notation — statut absolu depuis le taux d\'atteinte du KP Goal', () => {

    it('reproduit les catégories observées dans le classeur', () => {
        assert.equal(rateFromGoalPct(0.00).rate, RATES.DEADWEIGHT);
        assert.equal(rateFromGoalPct(0.14).rate, RATES.DEADWEIGHT);
        assert.equal(rateFromGoalPct(0.17).rate, RATES.NEED_IMPROVEMENT);
        assert.equal(rateFromGoalPct(0.25).rate, RATES.GOOD);
        assert.equal(rateFromGoalPct(0.29).rate, RATES.GOOD);
        assert.equal(rateFromGoalPct(1.00).rate, RATES.EXCELLENT);
        assert.equal(rateFromGoalPct(2.01).rate, RATES.EXCELLENT);
    });

    it('signale la zone où le classement d\'origine était contradictoire', () => {
        assert.equal(rateFromGoalPct(0.58).uncertain, true);
        assert.equal(rateFromGoalPct(0.64).uncertain, true);
        assert.equal(rateFromGoalPct(0.40).uncertain, false);
        assert.equal(rateFromGoalPct(0.90).uncertain, false);
    });

    it('la zone floue encadre bien la frontière Good/Excellent', () => {
        assert.ok(EXCELLENT_FUZZY_BAND.from < 0.60 && EXCELLENT_FUZZY_BAND.to > 0.60);
    });

    it('ne classe pas une valeur non numérique', () => {
        assert.equal(rateFromGoalPct(null).rate, null);
        assert.equal(rateFromGoalPct(undefined).rate, null);
    });
});

describe('notation — rescaling 1 → 10 du royaume', () => {

    it('place le minimum de la cohorte à 1', () => {
        closeTo(scaleTo10(2, 2, 20), 1, 1e-9, 'minimum');
    });

    it('laisse de la marge en haut grâce au maximum à 110 %', () => {
        const top = scaleTo10(20, 2, 20);
        assert.ok(top > 8 && top < 10, `le meilleur joueur doit approcher 9, pas saturer à 10 (${top})`);
    });

    it('refuse une cohorte dégénérée', () => {
        assert.equal(scaleTo10(5, 0, 0), null);
    });
});
