import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useRole } from '../context/RoleContext';
import { SHEET_SCHEMA, completeness, emptySheet } from '../lib/mentoringSchema';

/**
 * useMentoringSheet — E-010 / F-039 : charge, pré-remplit et sauvegarde la fiche
 * d'état d'un compte principal.
 *
 * **La fiche est clée par `governorId`, pas par uid** (BR-027). C'est ce qui permet
 * à un mentor de remplir celle d'un compte sans utilisateur : mesuré le 2026-10-21,
 * 23 des 41 comptes principaux de 2997 sont dans ce cas. Une clé par uid rendrait
 * le critère « 100 % des comptes » inatteignable.
 *
 * Trois filets, parce qu'un joueur bascule dans le jeu en plein formulaire et que
 * le navigateur mobile peut tuer l'onglet :
 *   1. autosave Firestore différé (1,5 s après la dernière frappe) ;
 *   2. miroir `localStorage` écrit à chaque frappe, relu au montage si plus récent ;
 *   3. `null` n'est jamais écrasé par `0` — cf. `mentoringSchema`.
 *
 * @param {string|null} governorId compte à éditer (le sien, ou celui d'un mentoré)
 */
export function useMentoringSheet(governorId) {
    const { currentUser } = useAuth();
    const { role } = useRole();
    const { players } = useData();

    const [blocks, setBlocks] = useState(() => emptySheet());
    const [meta, setMeta] = useState(null); // {enteredBy, enteredByRole, updatedAt, status}
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [prefilledFrom, setPrefilledFrom] = useState([]);

    const gid = governorId ? String(governorId) : null;
    const lsKey = gid ? `mentoring_draft_${gid}` : null;
    const timer = useRef(null);
    const dirty = useRef(false);

    // ── Chargement : fiche existante, sinon pré-remplissage ───────────────────
    useEffect(() => {
        let alive = true;
        if (!gid || !currentUser) { setLoading(false); return () => {}; }
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const snap = await getDoc(doc(db, 'mentoring_sheets', gid));
                let next = null;
                const sources = [];

                if (snap.exists()) {
                    const d = snap.data();
                    next = { ...emptySheet(), ...(d.blocks || {}) };
                    if (alive) setMeta({
                        enteredBy: d.enteredBy || null,
                        enteredByRole: d.enteredByRole || null,
                        updatedAt: d.updatedAt || null,
                        status: d.status || 'draft',
                    });
                } else {
                    next = await prefill(gid, players);
                    sources.push('declaration');
                    if (alive) setMeta(null);
                }

                // Le brouillon local prime s'il est plus récent que le serveur :
                // c'est le cas si l'onglet a été tué avant l'autosave.
                try {
                    const raw = lsKey && localStorage.getItem(lsKey);
                    if (raw) {
                        const draft = JSON.parse(raw);
                        const serverAt = snap.exists() ? Date.parse(snap.data().updatedAt || 0) : 0;
                        if (draft.at && draft.at > serverAt && draft.blocks) {
                            next = { ...next, ...draft.blocks };
                            sources.push('local');
                        }
                    }
                } catch { /* localStorage indisponible : on continue sans */ }

                if (!alive) return;
                setBlocks(next);
                setPrefilledFrom(sources);
            } catch (err) {
                console.error('[useMentoringSheet] chargement impossible', err);
                if (alive) setError(err);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
        // `players` n'est utilisé qu'au pré-remplissage initial : le relire à chaque
        // rafraîchissement du roster écraserait la saisie en cours.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gid, currentUser]);

    // ── Sauvegarde ────────────────────────────────────────────────────────────
    const persist = useCallback(async (nextBlocks) => {
        if (!gid || !currentUser) return;
        setSaving(true);
        try {
            const blockMeta = {};
            for (const b of SHEET_SCHEMA) blockMeta[b.id] = { updatedAt: new Date().toISOString() };
            await setDoc(doc(db, 'mentoring_sheets', gid), {
                governorId: gid,
                name: nextBlocks?.identity?.name || null,
                blocks: nextBlocks,
                blockMeta,
                status: completeness(nextBlocks).percent === 1 ? 'complete' : 'draft',
                // Trace QUI a saisi : le joueur voit « remplie par ton mentor », et le
                // Conseil sait à quel mentor réclamer une fiche manquante (B10).
                enteredBy: currentUser.uid,
                enteredByRole: role,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            dirty.current = false;
            setError(null);
        } catch (err) {
            console.error('[useMentoringSheet] sauvegarde refusée', err);
            setError(err);
        } finally {
            setSaving(false);
        }
    }, [gid, currentUser, role]);

    /** Met à jour un champ, programme l'autosave, et double en localStorage. */
    const setField = useCallback((blockId, fieldId, value) => {
        setBlocks((prev) => {
            const next = { ...prev, [blockId]: { ...prev[blockId], [fieldId]: value } };
            dirty.current = true;
            try {
                if (lsKey) localStorage.setItem(lsKey, JSON.stringify({ at: Date.now(), blocks: next }));
            } catch { /* quota ou mode privé : le filet 1 suffit */ }
            clearTimeout(timer.current);
            timer.current = setTimeout(() => persist(next), 1500);
            return next;
        });
    }, [lsKey, persist]);

    /** Fige une version immuable (BR-028). `takenAt` est horodaté par le SERVEUR. */
    const snapshotVersion = useCallback(async (versionId) => {
        if (!gid || !currentUser) return;
        await setDoc(doc(db, 'mentoring_sheets', gid, 'versions', versionId), {
            takenAt: serverTimestamp(),
            takenBy: currentUser.uid,
            blocks,
        });
    }, [gid, currentUser, blocks]);

    const progress = useMemo(() => completeness(blocks), [blocks]);

    // Sauvegarde immédiate à la sortie : l'autosave différé perdrait la dernière frappe.
    const flush = useCallback(() => {
        clearTimeout(timer.current);
        if (dirty.current) return persist(blocks);
        return Promise.resolve();
    }, [blocks, persist]);

    useEffect(() => () => clearTimeout(timer.current), []);

    return { blocks, setField, progress, loading, saving, error, meta, prefilledFrom, flush, snapshotVersion };
}

/**
 * Pré-remplissage : la dernière déclaration de guerre du gouverneur, plus le roster.
 * Mesuré sur 2997 — 123 des 143 déclarations portent `resources`, 123 portent
 * `speedups.total` et 110 portent les paires de commandants.
 * Dégradation propre : toute source absente laisse les champs à `null`.
 */
async function prefill(gid, players) {
    const next = emptySheet();
    const player = (players || []).find((p) => String(p.id) === gid);
    if (player) {
        next.identity.name = player.name ?? null;
        next.identity.power = player.power ?? null;
    }
    next.identity.governorId = gid;
    try {
        const snap = await getDocs(query(
            collection(db, 'war_availabilities'),
            where('governorId', '==', gid),
            orderBy('updatedAt', 'desc'),
            limit(1)
        ));
        const decl = snap.docs[0]?.data();
        if (decl) {
            if (decl.resources) {
                for (const k of ['food', 'wood', 'stone', 'gold']) {
                    if (decl.resources[k] != null) next.economy[k] = decl.resources[k];
                }
            }
            if (decl.activeHoursUTC?.from || decl.activeHoursUTC?.to) {
                next.identity.activeHoursUTC = decl.activeHoursUTC;
            }
            // Les paires elles-mêmes ne sont plus stockées dans la fiche
            // (2026-10-22) — elles restent dans la déclaration de guerre, seule
            // source de vérité. On n'en déduit que le type de troupe principal.
            if (Array.isArray(decl.marches) && decl.marches.length) {
                next.identity.mainTroopType = decl.marches[0]?.type ?? null;
            }
        }
    } catch (err) {
        // Index manquant ou lecture refusée : le pré-remplissage est un confort,
        // jamais un prérequis. On laisse les champs vides plutôt que d'échouer.
        console.warn('[useMentoringSheet] pré-remplissage indisponible', err);
    }
    return next;
}

export default useMentoringSheet;
