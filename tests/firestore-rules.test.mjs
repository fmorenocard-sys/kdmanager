/**
 * Tests des règles de sécurité Firestore — audit BUG-002.
 *
 *   npm run test:rules
 *
 * Les cas « ATTAQUE » sont les scénarios relevés par l'audit du 2026-07-22 : ils
 * réussissaient sur les règles d'avant durcissement (vérifié le jour même) et
 * doivent désormais être refusés. Les cas « USAGE » couvrent les parcours
 * légitimes — c'est le filet qui garantit que le durcissement n'a rien cassé.
 *
 * Rapport : docs/qa/Audit_Securite_Firestore_2026-07-22.md
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const RULES_FILE = process.env.RULES_FILE || 'firestore.rules';

let env;

// Rôles : les documents roles/{uid} sont écrits hors règles (comme le fait
// l'Admin SDK en production via la synchro Discord).
const KING = 'uid_king';
const OFFICER = 'uid_officer';
const WARRIOR = 'uid_warrior';
const INTRUDER = 'uid_intruder';

const as = (uid) => env.authenticatedContext(uid).firestore();
const guest = () => env.unauthenticatedContext().firestore();

before(async () => {
    env = await initializeTestEnvironment({
        projectId: 'kd-97-manager-rules-test',
        firestore: {
            host: '127.0.0.1',
            port: 8082,
            rules: readFileSync(RULES_FILE, 'utf8')
        }
    });

    await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'roles', KING), { role: 'King' });
        await setDoc(doc(db, 'roles', OFFICER), { role: 'Officer' });
        await setDoc(doc(db, 'roles', WARRIOR), { role: 'Warrior' });
        // INTRUDER n'a volontairement aucun document de rôle.

        await setDoc(doc(db, 'static_data', 'players'), { seed: true });
        await setDoc(doc(db, 'kvk_config', 'active'), { name: 'SoC 4', id: 'soc4' });
        await setDoc(doc(db, 'kvk_history', 'soc3'), { title: 'SoC 3', outcome: null });
        await setDoc(doc(db, 'kvk_race', 'soc4'), { campaignName: 'SoC 4' });
        await setDoc(doc(db, 'kvk_race', 'soc4', 'scans', '6'), { seq: 6 });
        await setDoc(doc(db, 'user_profiles', WARRIOR), { governorId: '111' });
        await setDoc(doc(db, 'war_availabilities', 'soc4_' + WARRIOR), {
            userId: WARRIOR, kvkId: 'soc4', governorId: '111'
        });
    });
});

after(async () => {
    await env?.cleanup();
});

describe(`Règles Firestore — ${RULES_FILE}`, () => {

    describe('H-1 · user_profiles : clés d\'identité', () => {

        it('USAGE — le propriétaire lie son gouverneur', async () => {
            await assertSucceeds(
                setDoc(doc(as(WARRIOR), 'user_profiles', WARRIOR), { governorId: '222' }, { merge: true })
            );
        });

        it('USAGE — le propriétaire lit son profil', async () => {
            await assertSucceeds(getDoc(doc(as(WARRIOR), 'user_profiles', WARRIOR)));
        });

        it('USAGE — le leadership lit le profil d\'un membre', async () => {
            await assertSucceeds(getDoc(doc(as(OFFICER), 'user_profiles', WARRIOR)));
        });

        it('ATTAQUE — se déclarer « Discord vérifié » (contournement BR-008)', async () => {
            const write = setDoc(
                doc(as(WARRIOR), 'user_profiles', WARRIOR),
                { discordId: '999999999' },
                { merge: true }
            );
            await assertFails(write);
        });

        it('ATTAQUE — usurper le discordId d\'un autre membre (resolvePlayer du bot)', async () => {
            const write = setDoc(
                doc(as(INTRUDER), 'user_profiles', INTRUDER),
                { discordId: '123456789', governorId: '111' },
                { merge: true }
            );
            await assertFails(write);
        });

        it('ATTAQUE — s\'écrire un champ role dans son profil', async () => {
            const write = setDoc(
                doc(as(WARRIOR), 'user_profiles', WARRIOR),
                { role: 'King' },
                { merge: true }
            );
            await assertFails(write);
        });

        it('REFUS — écrire dans le profil d\'un autre membre', async () => {
            await assertFails(
                setDoc(doc(as(INTRUDER), 'user_profiles', WARRIOR), { governorId: '666' }, { merge: true })
            );
        });
    });

    describe('Élévation de privilège · roles', () => {

        it('REFUS — s\'écrire le rôle King', async () => {
            await assertFails(setDoc(doc(as(WARRIOR), 'roles', WARRIOR), { role: 'King' }));
        });

        it('USAGE — lire son propre rôle', async () => {
            await assertSucceeds(getDoc(doc(as(WARRIOR), 'roles', WARRIOR)));
        });

        it('ATTAQUE — B-2 : énumérer le leadership sans compte', async () => {
            const read = getDoc(doc(guest(), 'roles', KING));
            await assertFails(read);
        });
    });

    describe('M-2 · kvk_config : campagne active', () => {

        it('USAGE — le Roi écrit la config', async () => {
            await assertSucceeds(
                setDoc(doc(as(KING), 'kvk_config', 'active'), { name: 'SoC 5' }, { merge: true })
            );
        });

        it('ATTAQUE — un Officier repointe la campagne active', async () => {
            const write = setDoc(
                doc(as(OFFICER), 'kvk_config', 'active'), { id: 'pirate' }, { merge: true }
            );
            await assertFails(write);
        });

        it('REFUS — un Warrior écrit la config', async () => {
            await assertFails(
                setDoc(doc(as(WARRIOR), 'kvk_config', 'active'), { id: 'x' }, { merge: true })
            );
        });
    });

    describe('M-1 · war_availabilities : déclarations', () => {

        it('USAGE — déclarer pour soi', async () => {
            await assertSucceeds(
                setDoc(doc(as(OFFICER), 'war_availabilities', 'soc4_' + OFFICER), {
                    userId: OFFICER, kvkId: 'soc4'
                })
            );
        });

        it('USAGE — le Roi recrée une déclaration pour autrui (outil de fusion)', async () => {
            await assertSucceeds(
                setDoc(doc(as(KING), 'war_availabilities', 'soc5_' + WARRIOR), {
                    userId: WARRIOR, kvkId: 'soc5'
                })
            );
        });

        it('USAGE — le propriétaire met à jour sa déclaration', async () => {
            await assertSucceeds(
                updateDoc(doc(as(WARRIOR), 'war_availabilities', 'soc4_' + WARRIOR), { governorId: '333' })
            );
        });

        it('ATTAQUE — forger la déclaration d\'un membre qui n\'a pas encore déclaré', async () => {
            const write = setDoc(
                doc(as(INTRUDER), 'war_availabilities', 'soc4_' + KING),
                { userId: KING, kvkId: 'soc4', troops: 'aucune' }
            );
            await assertFails(write);
        });

        it('REFUS — écraser la déclaration existante d\'un autre', async () => {
            await assertFails(
                updateDoc(doc(as(INTRUDER), 'war_availabilities', 'soc4_' + WARRIOR), { governorId: '666' })
            );
        });
    });

    describe('kvk_history : immuabilité de l\'archive', () => {

        it('USAGE — le Roi saisit le résultat officiel (BR-012)', async () => {
            await assertSucceeds(
                updateDoc(doc(as(KING), 'kvk_history', 'soc3'), { outcome: 'victory_star' })
            );
        });

        it('REFUS — le Roi réécrit les données archivées', async () => {
            await assertFails(
                updateDoc(doc(as(KING), 'kvk_history', 'soc3'), { title: 'réécrit' })
            );
        });

        it('REFUS — un Officier saisit le résultat', async () => {
            await assertFails(
                updateDoc(doc(as(OFFICER), 'kvk_history', 'soc3'), { outcome: 'defeat' })
            );
        });
    });

    describe('kvk_race : visibilité leadership (§9.4)', () => {

        it('USAGE — un Officier lit les agrégats', async () => {
            await assertSucceeds(getDoc(doc(as(OFFICER), 'kvk_race', 'soc4', 'scans', '6')));
        });

        it('USAGE — le Roi écrit la config de course', async () => {
            await assertSucceeds(
                setDoc(doc(as(KING), 'kvk_race', 'soc4'), { dkpWeights: { t4: 40 } }, { merge: true })
            );
        });

        it('REFUS — un Warrior lit la course', async () => {
            await assertFails(getDoc(doc(as(WARRIOR), 'kvk_race', 'soc4')));
        });

        it('REFUS — un Officier écrit un agrégat (réservé aux Functions)', async () => {
            await assertFails(
                setDoc(doc(as(OFFICER), 'kvk_race', 'soc4', 'scans', '6'), { seq: 99 })
            );
        });
    });

    describe('static_data : B-1 non traité (arbitrage produit)', () => {

        it('CONSTAT — lecture publique sans compte (B-1, assume pour l instant)', async () => {
            await assertSucceeds(getDoc(doc(guest(), 'static_data', 'players')));
        });

        it('REFUS — écriture, même par le Roi', async () => {
            await assertFails(setDoc(doc(as(KING), 'static_data', 'players'), { seed: false }));
        });
    });

    describe('Collections internes Discord', () => {

        it('REFUS — lire les jetons de liaison (refus par défaut)', async () => {
            await assertFails(getDoc(doc(as(KING), '_discord_link_tokens', 'whatever')));
        });
    });

    it('méta — le fichier de règles testé est bien celui attendu', () => {
        assert.ok(readFileSync(RULES_FILE, 'utf8').includes('service cloud.firestore'));
    });
});
