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
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
// La charge utile réelle du client (E-010) : on l'écrit ici telle quelle plutôt
// que d'en recopier une approximation, sinon le test valide une forme que
// personne n'envoie — c'est précisément ce qui a laissé passer BUG-019.
import { sheetWritePayload, emptySheet } from '../src/lib/mentoringSchema.js';

const RULES_FILE = process.env.RULES_FILE || 'firestore.rules';

let env;

// Rôles : les documents roles/{uid} sont écrits hors règles (comme le fait
// l'Admin SDK en production via la synchro Discord).
const ADMIN = 'uid_admin';
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
        await setDoc(doc(db, 'roles', ADMIN), { role: 'Admin' });
        await setDoc(doc(db, 'roles', KING), { role: 'King' });
        await setDoc(doc(db, 'roles', OFFICER), { role: 'Officer' });
        await setDoc(doc(db, 'roles', WARRIOR), { role: 'Warrior' });
        // INTRUDER n'a volontairement aucun document de rôle.

        await setDoc(doc(db, 'static_data', 'players'), { seed: true });
        await setDoc(doc(db, 'kvk_config', 'active'), { name: 'SoC 4', id: 'soc4' });
        await setDoc(doc(db, 'kvk_history', 'soc3'), { title: 'SoC 3', outcome: null });
        await setDoc(doc(db, 'kvk_race', 'soc4'), { campaignName: 'SoC 4' });
        await setDoc(doc(db, 'kvk_race', 'soc4', 'scans', '6'), { seq: 6 });
        // E-010 : `warGovernorIds` est le miroir plat des comptes `war` lu par les
        // règles du mentorat. WARRIOR a réclamé le gouverneur 111, pas le 999.
        await setDoc(doc(db, 'user_profiles', WARRIOR), {
            governorId: '111',
            accounts: [{ governorId: '111', type: 'war', name: 'Helios' }],
            warGovernorIds: ['111']
        });
        await setDoc(doc(db, 'war_availabilities', 'soc4_' + WARRIOR), {
            userId: WARRIOR, kvkId: 'soc4', governorId: '111'
        });
        // Fiche d'un compte principal ORPHELIN (aucun utilisateur ne l'a réclamé) :
        // c'est le cas des 23 comptes de 2997 mesurés le 2026-10-21.
        await setDoc(doc(db, 'mentoring_sheets', '999'), {
            governorId: '999', name: 'Orphelin', blocks: {}, enteredBy: OFFICER
        });
        await setDoc(doc(db, 'mentoring_sheets', '111'), {
            governorId: '111', name: 'Helios', blocks: {}, enteredBy: WARRIOR
        });
        await setDoc(doc(db, 'mentoring_sheets', '111', 'versions', 'soc4_post'), {
            takenAt: new Date(), takenBy: WARRIOR, blocks: {}
        });
        await setDoc(doc(db, 'mentoring_program', 'main'), { scopeGovernorIds: ['111', '999'] });
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

        it('USAGE — le propriétaire écrit sa liste de comptes (F-025)', async () => {
            await assertSucceeds(
                setDoc(doc(as(WARRIOR), 'user_profiles', WARRIOR), {
                    governorId: '222',
                    accounts: [{ governorId: '222', type: 'war', name: 'Helios' }],
                    updatedAt: '2026-07-27T00:00:00Z'
                }, { merge: true })
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

    describe('BR-022 · war_availabilities : gel au démarrage de la campagne', () => {
        // Campagne COURANTE démarrée (startDate dans le passé). Posée ici seulement
        // (pas dans le before global) pour ne pas geler les autres cas M-1, et
        // nettoyée après pour ne pas fuiter sur le test « méta ».
        before(async () => {
            await env.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), 'kvk_config', 'current'), {
                    id: 'soc_started', name: 'SoC Started', startDate: new Date('2020-01-01T00:00:00Z'),
                });
            });
        });
        after(async () => {
            await env.withSecurityRulesDisabled(async (ctx) => {
                await deleteDoc(doc(ctx.firestore(), 'kvk_config', 'current'));
            });
        });

        it('REFUS — un Warrior ne peut plus créer sa déclaration après le démarrage', async () => {
            await assertFails(setDoc(doc(as(WARRIOR), 'war_availabilities', 'soc_started_' + WARRIOR), {
                userId: WARRIOR, kvkId: 'soc_started', governorId: '111'
            }));
        });
        it('REFUS — un Warrior ne peut plus modifier sa déclaration après le démarrage', async () => {
            await assertFails(updateDoc(doc(as(WARRIOR), 'war_availabilities', 'soc4_' + WARRIOR), { governorId: '999' }));
        });
        it('REFUS — un Officier est gelé comme un Warrior (seul le Roi corrige)', async () => {
            await assertFails(setDoc(doc(as(OFFICER), 'war_availabilities', 'soc_started_' + OFFICER), {
                userId: OFFICER, kvkId: 'soc_started', governorId: '222'
            }));
        });
        it('USAGE — le Roi (admin) peut toujours corriger la déclaration d\'un Warrior', async () => {
            await assertSucceeds(updateDoc(doc(as(KING), 'war_availabilities', 'soc4_' + WARRIOR), { governorId: '333' }));
        });
        it('USAGE — l\'Admin (super-admin) peut aussi corriger après le démarrage', async () => {
            await assertSucceeds(setDoc(doc(as(ADMIN), 'war_availabilities', 'soc_started_' + ADMIN), {
                userId: ADMIN, kvkId: 'soc_started', governorId: '444'
            }));
        });
    });

    describe('Admin · super-admin hérite des pouvoirs Roi', () => {
        it('USAGE — l\'Admin écrit la config de campagne (pouvoir Roi, BR-020/M-2)', async () => {
            await assertSucceeds(
                setDoc(doc(as(ADMIN), 'kvk_config', 'active'), { name: 'SoC 5 by admin' }, { merge: true })
            );
        });
        it('USAGE — l\'Admin saisit le résultat officiel d\'une archive (pouvoir Roi, BR-012)', async () => {
            await assertSucceeds(
                setDoc(doc(as(ADMIN), 'kvk_history', 'soc3'), { outcome: 'Victory' }, { merge: true })
            );
        });
        it('USAGE — l\'Admin lit les agrégats de course (leadership)', async () => {
            await assertSucceeds(getDoc(doc(as(ADMIN), 'kvk_race', 'soc4', 'scans', '6')));
        });
    });

    // E-010 / F-039 / BR-027 — programme de mentorat.
    // La fiche est clée par `governorId` (pas par uid) pour qu'un mentor puisse
    // remplir celle d'un compte sans utilisateur. Ces tests verrouillent les deux
    // promesses du brief : « aucun joueur ne peut ouvrir la fiche d'un autre » et
    // « l'ancienne version reste consultable ».
    describe('E-010 · fiches de mentorat : accès', () => {
        it('USAGE — le joueur lit la fiche du gouverneur qu\'il a réclamé', async () => {
            await assertSucceeds(getDoc(doc(as(WARRIOR), 'mentoring_sheets', '111')));
        });

        it('ATTAQUE — un joueur NE lit PAS la fiche d\'un gouverneur qu\'il n\'a pas réclamé', async () => {
            // Critère de réussite n°4 du brief.
            await assertFails(getDoc(doc(as(WARRIOR), 'mentoring_sheets', '999')));
        });

        it('ATTAQUE — un connecté sans profil ne lit aucune fiche', async () => {
            await assertFails(getDoc(doc(as(INTRUDER), 'mentoring_sheets', '111')));
        });

        it('ATTAQUE — un visiteur non connecté ne lit aucune fiche', async () => {
            await assertFails(getDoc(doc(guest(), 'mentoring_sheets', '111')));
        });

        it('USAGE — l\'Officier (mentor / Conseil) lit toutes les fiches', async () => {
            await assertSucceeds(getDoc(doc(as(OFFICER), 'mentoring_sheets', '999')));
        });

        it('USAGE — le mentor remplit la fiche d\'un compte ORPHELIN, en se traçant', async () => {
            // C'est le levier du MVP : sans lui, 23 des 41 comptes n'ont pas de fiche.
            await assertSucceeds(setDoc(doc(as(OFFICER), 'mentoring_sheets', '777'), {
                governorId: '777', name: 'Sans compte', blocks: {}, blockMeta: {},
                status: 'draft', enteredBy: OFFICER, enteredByRole: 'Officer',
                createdAt: new Date(), updatedAt: new Date()
            }));
        });

        it('USAGE — la DEUXIÈME sauvegarde passe aussi (BUG-019)', async () => {
            // Le formulaire autosauvegarde 1,5 s après la dernière frappe : la
            // première écriture CRÉE, toutes les suivantes METTENT À JOUR. Seul
            // le cas `create` était couvert, et c'est ce trou qui a laissé partir
            // en production une fiche impossible à sauvegarder deux fois.
            const ref = doc(as(OFFICER), 'mentoring_sheets', '781');
            const base = { governorId: '781', blocks: emptySheet(), uid: OFFICER, role: 'Officer' };
            await assertSucceeds(setDoc(ref,
                sheetWritePayload({ ...base, isNew: true, at: '2026-10-23T10:00:00.000Z' }),
                { merge: true }));
            await assertSucceeds(setDoc(ref,
                sheetWritePayload({ ...base, isNew: false, at: '2026-10-23T10:00:01.500Z' }),
                { merge: true }));
        });

        it('RÉGRESSION — renvoyer createdAt en mise à jour reste refusé', async () => {
            // La règle est juste : une date de création qui bouge n'en est pas une.
            // C'est le client qui avait tort. Ce test fige la frontière, pour que
            // le correctif ne soit pas défait par mégarde.
            const ref = doc(as(OFFICER), 'mentoring_sheets', '782');
            const base = { governorId: '782', blocks: emptySheet(), uid: OFFICER, role: 'Officer' };
            await assertSucceeds(setDoc(ref,
                sheetWritePayload({ ...base, isNew: true, at: '2026-10-23T10:00:00.000Z' }),
                { merge: true }));
            await assertFails(setDoc(ref,
                sheetWritePayload({ ...base, isNew: true, at: '2026-10-23T10:00:01.500Z' }),
                { merge: true }));
        });

        it('ATTAQUE — on ne peut pas se faire passer pour un autre saisisseur', async () => {
            await assertFails(setDoc(doc(as(OFFICER), 'mentoring_sheets', '778'), {
                governorId: '778', name: 'X', blocks: {}, blockMeta: {},
                status: 'draft', enteredBy: KING, enteredByRole: 'King',
                createdAt: new Date(), updatedAt: new Date()
            }));
        });

        it('ATTAQUE — la clé du document doit correspondre au governorId écrit', async () => {
            await assertFails(setDoc(doc(as(OFFICER), 'mentoring_sheets', '779'), {
                governorId: '000', name: 'X', blocks: {}, blockMeta: {},
                status: 'draft', enteredBy: OFFICER, enteredByRole: 'Officer',
                createdAt: new Date(), updatedAt: new Date()
            }));
        });

        it('ATTAQUE — un champ hors forme est refusé (garde-fou M-3)', async () => {
            await assertFails(setDoc(doc(as(OFFICER), 'mentoring_sheets', '780'), {
                governorId: '780', blocks: {}, enteredBy: OFFICER,
                createdAt: new Date(), updatedAt: new Date(),
                role: 'King' // champ étranger
            }));
        });

        it('ATTAQUE — un joueur ne modifie pas la fiche d\'un autre', async () => {
            await assertFails(updateDoc(doc(as(WARRIOR), 'mentoring_sheets', '999'), {
                status: 'complete', enteredBy: WARRIOR, updatedAt: new Date()
            }));
        });
    });

    describe('E-010 · fiches de mentorat : versions figées (BR-028)', () => {
        it('USAGE — le joueur lit les versions de sa propre fiche', async () => {
            await assertSucceeds(getDoc(doc(as(WARRIOR), 'mentoring_sheets', '111', 'versions', 'soc4_post')));
        });

        it('ATTAQUE — une version ne peut pas être ANTIDATÉE', async () => {
            // `takenAt == request.time` : sans horodatage serveur, c'est refusé.
            await assertFails(setDoc(doc(as(WARRIOR), 'mentoring_sheets', '111', 'versions', 'faux'), {
                takenAt: new Date('2020-01-01'), takenBy: WARRIOR, blocks: {}
            }));
        });

        it('USAGE — une version horodatée par le serveur est acceptée', async () => {
            await assertSucceeds(setDoc(doc(as(WARRIOR), 'mentoring_sheets', '111', 'versions', 'soc5_pre'), {
                takenAt: serverTimestamp(), takenBy: WARRIOR, blocks: {}
            }));
        });

        it('ATTAQUE — une version déjà écrite est IMMUABLE (critère n°5)', async () => {
            await assertFails(updateDoc(doc(as(OFFICER), 'mentoring_sheets', '111', 'versions', 'soc4_post'), {
                blocks: { falsifie: true }
            }));
        });

        it('ATTAQUE — un joueur ne lit pas les versions d\'un autre', async () => {
            await assertFails(getDoc(doc(as(WARRIOR), 'mentoring_sheets', '999', 'versions', 'x')));
        });
    });

    describe('E-010 · périmètre du programme', () => {
        it('USAGE — le Conseil lit le périmètre', async () => {
            await assertSucceeds(getDoc(doc(as(OFFICER), 'mentoring_program', 'main')));
        });

        it('ATTAQUE — un joueur ne lit pas le périmètre', async () => {
            await assertFails(getDoc(doc(as(WARRIOR), 'mentoring_program', 'main')));
        });

        it('ATTAQUE — un Officier ne MODIFIE pas le périmètre (Roi seul)', async () => {
            await assertFails(setDoc(doc(as(OFFICER), 'mentoring_program', 'main'),
                { scopeGovernorIds: ['111'] }, { merge: true }));
        });

        it('USAGE — le Roi amorce le périmètre', async () => {
            await assertSucceeds(setDoc(doc(as(KING), 'mentoring_program', 'main'),
                { scopeGovernorIds: ['111', '999', '777'] }, { merge: true }));
        });
    });

    it('méta — le fichier de règles testé est bien celui attendu', () => {
        assert.ok(readFileSync(RULES_FILE, 'utf8').includes('service cloud.firestore'));
    });
});
