// Règle partagée « les stats live sont-elles celles de la campagne courante ? »
// (src/lib/campaignFreshness.js). Pure, donc testable sans émulateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    toDayUTC, campaignNotStarted, statsMatchArchive, liveStatsAreCurrent, indexArchive,
} from '../src/lib/campaignFreshness.js';

const NOW = new Date('2026-10-14T12:00:00Z');
const row = (id, initialPower, totalDead) => ({ id, initialPower, totalDead });

test('toDayUTC — accepte chaîne, Date et Timestamp Firestore', () => {
    assert.equal(toDayUTC('2026-10-23'), '2026-10-23');
    assert.equal(toDayUTC('2026-10-23T00:00:00.000Z'), '2026-10-23');
    assert.equal(toDayUTC(new Date('2026-10-23T00:00:00Z')), '2026-10-23');
    assert.equal(toDayUTC({ toDate: () => new Date('2026-10-23T00:00:00Z') }), '2026-10-23');
    assert.equal(toDayUTC({ seconds: Date.UTC(2026, 9, 23) / 1000 }), '2026-10-23');
    assert.equal(toDayUTC(null), null);
    assert.equal(toDayUTC('je ne suis pas une date'), 'je ne suis');
});

test('campaignNotStarted — une date future bloque, une date passée non', () => {
    assert.equal(campaignNotStarted('2026-10-23', NOW), true);
    assert.equal(campaignNotStarted('2026-07-31', NOW), false);
    // Le jour même compte comme démarré.
    assert.equal(campaignNotStarted('2026-10-14', NOW), false);
});

test('campaignNotStarted — sans date connue, on ne présume RIEN', () => {
    // Une config non renseignée ne doit jamais masquer des données valides.
    assert.equal(campaignNotStarted(null, NOW), false);
    assert.equal(campaignNotStarted(undefined, NOW), false);
});

test('statsMatchArchive — live identique à l\'archive ⇒ archivé', () => {
    const live = [row(1, 100, 10), row(2, 200, 20)];
    const arch = indexArchive({ list: [row(1, 100, 10), row(2, 200, 20)] });
    assert.equal(statsMatchArchive(live, arch), true);
});

test('statsMatchArchive — un seul écart réel suffit à conclure « courant »', () => {
    const live = [row(1, 100, 10), row(2, 200, 25)]; // morts de 2 ont bougé
    const arch = indexArchive({ list: [row(1, 100, 10), row(2, 200, 20)] });
    assert.equal(statsMatchArchive(live, arch), false);
});

test('statsMatchArchive — sans archive ou sans live, aucun verdict', () => {
    assert.equal(statsMatchArchive([row(1, 100, 10)], null), false);
    assert.equal(statsMatchArchive([row(1, 100, 10)], new Map()), false);
    assert.equal(statsMatchArchive([], indexArchive({ list: [row(1, 100, 10)] })), false);
});

test('statsMatchArchive — une ligne sans référence figée ne prouve rien', () => {
    // initialPower à 0 : on ne peut rien conclure, donc aucune ligne comparée.
    const live = [row(1, 0, 10)];
    const arch = indexArchive({ list: [row(1, 0, 10)] });
    assert.equal(statsMatchArchive(live, arch), false);
});

test('statsMatchArchive — les gouverneurs absents de l\'archive sont ignorés', () => {
    // Un nouveau joueur n'invalide pas le verdict porté par les autres.
    const live = [row(1, 100, 10), row(99, 500, 0)];
    const arch = indexArchive({ list: [row(1, 100, 10)] });
    assert.equal(statsMatchArchive(live, arch), true);
});

test('indexArchive — mains ET fillers, indexés par id en chaîne', () => {
    const m = indexArchive({ list: [row(1, 100, 10)], fillerList: [row(2, 200, 20)] });
    assert.equal(m.size, 2);
    assert.ok(m.get('1') && m.get('2'));
    assert.equal(indexArchive(null), null);
});

test('liveStatsAreCurrent — cas réel du pilote 3341 (2026-10-14)', () => {
    // Campagne 002_MightyAssembly ouverte au 23/10, stats live encore celles de Troy.
    const troy = [row(1, 100, 10), row(2, 200, 20)];
    const verdict = liveStatsAreCurrent({
        startDate: '2026-10-23',
        liveRows: troy,
        archiveById: indexArchive({ list: troy }),
        now: NOW,
    });
    assert.equal(verdict, false, 'la frise ne doit pas afficher Troy sous le nom de la nouvelle campagne');
});

test('liveStatsAreCurrent — chacun des deux signaux suffit, isolément', () => {
    const live = [row(1, 100, 10)];
    const autreArchive = indexArchive({ list: [row(1, 100, 99)] });
    // 1. campagne pas commencée, mais données différentes de l'archive
    assert.equal(liveStatsAreCurrent({ startDate: '2026-10-23', liveRows: live, archiveById: autreArchive, now: NOW }), false);
    // 2. campagne commencée, mais données identiques à l'archive
    assert.equal(liveStatsAreCurrent({ startDate: '2026-07-31', liveRows: live, archiveById: indexArchive({ list: live }), now: NOW }), false);
});

test('liveStatsAreCurrent — campagne commencée avec des chiffres neufs ⇒ on affiche', () => {
    assert.equal(liveStatsAreCurrent({
        startDate: '2026-07-31',
        liveRows: [row(1, 100, 55)],
        archiveById: indexArchive({ list: [row(1, 100, 10)] }),
        now: NOW,
    }), true);
});

test('liveStatsAreCurrent — appelé sans rien, ne masque pas', () => {
    // Dégradation propre : un appelant qui n'a pas encore chargé ses données ne
    // doit pas voir ses chiffres disparaître.
    assert.equal(liveStatsAreCurrent(), true);
    assert.equal(liveStatsAreCurrent({ now: NOW }), true);
});

test('parité /me — une seule ligne reproduit le comportement UXA11Y-010', () => {
    // useMyKvkGoals passe la SEULE ligne du compte principal : le verdict doit
    // être strictement celui de l'ancienne logique inline.
    const primary = row(42, 118e6, 3262800);
    const archived = indexArchive({ list: [row(42, 118e6, 3262800)] });
    assert.equal(liveStatsAreCurrent({ startDate: '2026-07-31', liveRows: [primary], archiveById: archived, now: NOW }), false);
    // Compte principal absent des stats live → ancienne logique : scanIsArchived=false
    assert.equal(liveStatsAreCurrent({ startDate: '2026-07-31', liveRows: [], archiveById: archived, now: NOW }), true);
    // Compte absent de l'archive → ancienne logique : scanIsArchived=false
    assert.equal(liveStatsAreCurrent({ startDate: '2026-07-31', liveRows: [primary], archiveById: indexArchive({ list: [] }), now: NOW }), true);
});
