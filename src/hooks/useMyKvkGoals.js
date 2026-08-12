import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { computeKvkGoals, computeFillerGoal } from '../lib/kvkGoals';
import { rateFromGoalPct } from '../lib/kvkScoring';

/**
 * F-032 / F-014 / F-027 — objectif KvK de l'UTILISATEUR COURANT, exposé sans
 * dépendance à un composant de table (spec Espace_Perso §5.2).
 *
 * Source unique de calcul partagée avec le War Tracker : `computeKvkGoals` (war)
 * et `computeFillerGoal` (filler, extrait en lib) — aucune duplication de barème.
 * Le hook se contente de la JOINTURE scopée aux comptes réclamés de l'utilisateur
 * (une ligne par compte, war et filler mêlés, chacun avec son barème / BR-016/018).
 *
 * « Publié » (war) = présence d'un `initialPower` figé au snapshot Pass 1 dans
 * kvkStats (spec §6.2) — sinon l'objectif n'existe pas encore et l'espace perso
 * montre `NoGoalPublishedCard`. « Publié » (filler) = déclaration de stacks T4/T5
 * présente (target > 0).
 *
 * BR-019 : `revealed` reflète `kvk_config.revealGoalStatus` (King-only) — les
 * CHIFFRES restent toujours visibles, seul le LABEL de statut est gaté côté UI.
 *
 * @returns {{loading:boolean, revealed:boolean, kvkId:string|null,
 *   campaignName:string|null, rows:Array<object>, primaryRow:object|null}}
 */
export function useMyKvkGoals() {
    const { currentUser, governorId, accounts } = useAuth();
    const { kvkStats, kvkFillerStats } = useData();

    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);
    const [fillerDecls, setFillerDecls] = useState({}); // { [governorId]: { t4, t5 } }

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const curSnap = await getDoc(doc(db, 'kvk_config', 'current'));
                if (!alive) return;
                const cur = curSnap.exists() ? curSnap.data() : null;
                setConfig(cur);

                const kvkId = cur?.id || 'default_kvk';
                // Lecture bornée : uniquement les déclarations des comptes FILLER
                // (leur objectif dépend des stacks T4/T5 déclarés). Les comptes de
                // guerre tirent leur objectif de kvkStats, pas d'une déclaration.
                const fillerAccts = (accounts || []).filter((a) => a.type === 'filler');
                const entries = {};
                if (currentUser && fillerAccts.length) {
                    await Promise.all(fillerAccts.map(async (a) => {
                        const gid = String(a.governorId);
                        let sn = await getDoc(doc(db, 'war_availabilities', `${kvkId}_${currentUser.uid}_${gid}`));
                        if (!sn.exists() && gid === String(governorId || '')) {
                            sn = await getDoc(doc(db, 'war_availabilities', `${kvkId}_${currentUser.uid}`));
                        }
                        if (sn.exists()) {
                            const dd = sn.data();
                            entries[gid] = { t4: dd.filler?.t4 || 0, t5: dd.filler?.t5 || 0 };
                        }
                    }));
                }
                if (!alive) return;
                setFillerDecls(entries);
            } catch (e) {
                console.error('[useMyKvkGoals] échec lecture config/déclarations filler', e);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [currentUser, governorId, accounts]);

    const statsById = useMemo(() => {
        const m = new Map();
        [...(kvkStats || []), ...(kvkFillerStats || [])].forEach((k) => m.set(String(k.id), k));
        return m;
    }, [kvkStats, kvkFillerStats]);

    const ratio = config?.fillerDeathRatio ?? 0.5;
    const revealed = config?.revealGoalStatus === true;
    const kvkId = config?.id || null;
    const campaignName = config?.name || null;

    const rows = useMemo(() => {
        const list = (accounts && accounts.length)
            ? accounts
            : (governorId ? [{ governorId, type: 'war' }] : []);

        return list.map((a) => {
            const gid = String(a.governorId);
            const kvk = statsById.get(gid) || null;
            const name = kvk?.name || a.name || gid;

            if (a.type === 'filler') {
                const decl = fillerDecls[gid];
                const { declaredPower, target, achieved, attainment } =
                    computeFillerGoal(decl?.t4, decl?.t5, kvk?.t4Dead, kvk?.t5Dead, ratio);
                const { rate, uncertain } = rateFromGoalPct(attainment);
                return {
                    governorId: gid, name, type: 'filler',
                    published: target > 0,
                    declaredPower, target, achieved, pct: attainment, rate, uncertain,
                };
            }

            // Compte de guerre : objectif calé sur la puissance INITIALE figée
            // (référence officielle) — pas la puissance courante. Absente = pas publié.
            const power = kvk?.initialPower || 0;
            const goals = computeKvkGoals(power);
            const kpGained = kvk?.totalKpGained ?? null;
            const goalPct = (kpGained != null && goals.goalKp > 0)
                ? kpGained / (goals.goalKp * 1e6)
                : null;
            const { rate, uncertain } = rateFromGoalPct(goalPct);
            return {
                governorId: gid, name, type: 'war',
                published: power > 0,
                powerM: goals.powerM,
                minKp: goals.minKp,
                goalKp: goals.goalKp,
                minDeadTroops: goals.minDeadApproxTroops,
                outOfDomain: goals.outOfDomain,
                kpGained, pct: goalPct, rate, uncertain,
            };
        });
    }, [accounts, governorId, statsById, fillerDecls, ratio]);

    const primaryRow = useMemo(() => {
        if (!rows.length) return null;
        return rows.find((r) => r.governorId === String(governorId || '')) || rows[0];
    }, [rows, governorId]);

    return { loading, revealed, kvkId, campaignName, rows, primaryRow };
}

export default useMyKvkGoals;
