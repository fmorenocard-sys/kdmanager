import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
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
    // Dernière campagne archivée (kvk_history) : { title, archivedAt, byId:Map }.
    // Sert de signal robuste de cohérence campagne (cf. statsCurrent plus bas).
    const [archiveInfo, setArchiveInfo] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            // Réservé aux utilisateurs connectés (kvk_config n'est pas public) —
            // évite les permission-denied sur /me pour un visiteur avant redirection.
            if (!currentUser) { setLoading(false); return; }
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

                // Dernière campagne archivée (une seule lecture : order desc, limit 1).
                // Sa `list`/`fillerList` est une copie FIGÉE du scan au moment de
                // l'archivage → référence pour savoir si le scan live est encore
                // celui de cette campagne passée.
                try {
                    const aSnap = await getDocs(query(collection(db, 'kvk_history'), orderBy('order', 'desc'), limit(1)));
                    if (!alive) return;
                    const latest = aSnap.docs[0]?.data();
                    if (latest) {
                        const byId = new Map();
                        [...(latest.list || []), ...(latest.fillerList || [])].forEach((k) => byId.set(String(k.id), k));
                        setArchiveInfo({ title: latest.title || null, archivedAt: latest.archivedAt || null, byId });
                    } else {
                        setArchiveInfo(null);
                    }
                } catch (e) {
                    // Archive optionnelle : son absence ne doit pas casser l'objectif.
                    console.warn('[useMyKvkGoals] kvk_history indisponible (non bloquant)', e);
                }
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

    // F-032 — cohérence de contexte campagne. `static_data/kvk` (les stats live)
    // ne porte AUCUN identifiant de campagne : on ne peut pas lire dessus à quelle
    // campagne il appartient. On détecte donc si le scan live est PÉRIMÉ (chiffres
    // d'une campagne passée) par deux signaux robustes et indépendants :
    //
    //  1. scanIsArchived — les chiffres live du compte principal (puissance
    //     initiale + morts totales) sont IDENTIQUES à ceux figés dans la dernière
    //     archive kvk_history → le scan live EST cette campagne passée. Décisif :
    //     le total de morts d'une campagne finie ne coïncide pas avec celui d'une
    //     campagne fraîchement démarrée.
    //  2. campaignNotStarted — la campagne courante a une date de début dans le
    //     futur → elle n'a par définition aucune stat encore.
    //
    // Dans les deux cas, l'objectif est « pas encore publié » pour la campagne
    // courante (NoGoalPublishedCard) plutôt que d'afficher des chiffres périmés.
    // (Le champ static_data/kvk.updatedAt s'est révélé absent/inexploitable en
    // prod — d'où le choix de ces deux signaux et non d'une heuristique de date.)
    const startDate = config?.startDate?.toDate ? config.startDate.toDate() : null;
    const campaignNotStarted = !!(startDate && startDate.getTime() > new Date().getTime());
    const primaryGid = String(governorId || '');
    const livePrimary = statsById.get(primaryGid) || null;
    const archPrimary = archiveInfo?.byId?.get(primaryGid) || null;
    const scanIsArchived = !!(livePrimary && archPrimary
        && Number(livePrimary.initialPower || 0) > 0
        && Number(livePrimary.initialPower || 0) === Number(archPrimary.initialPower || 0)
        && Number(livePrimary.totalDead || 0) === Number(archPrimary.totalDead || 0));
    const statsCurrent = !(scanIsArchived || campaignNotStarted);

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
                    published: statsCurrent && target > 0,
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
                published: statsCurrent && power > 0,
                powerM: goals.powerM,
                minKp: goals.minKp,
                goalKp: goals.goalKp,
                minDeadTroops: goals.minDeadApproxTroops,
                outOfDomain: goals.outOfDomain,
                kpGained, pct: goalPct, rate, uncertain,
            };
        });
    }, [accounts, governorId, statsById, fillerDecls, ratio, statsCurrent]);

    const primaryRow = useMemo(() => {
        if (!rows.length) return null;
        return rows.find((r) => r.governorId === String(governorId || '')) || rows[0];
    }, [rows, governorId]);

    // Stats de campagne condensées du compte principal (F-032 Lot 4 / « Mes stats
    // web », parité /mystats SANS Kingdom rank — décision Roi §12.4). Mêmes données
    // que l'objectif → cohérentes avec statsCurrent (masquées si scan périmé).
    const primaryStats = (() => {
        if (!livePrimary) return null;
        return {
            powerM: (Number(livePrimary.finalPower) || Number(livePrimary.initialPower) || 0) / 1e6,
            kpGainedM: (Number(livePrimary.totalKpGained) || 0) / 1e6,
            deaths: Number(livePrimary.totalDead) || 0,
        };
    })();

    return { loading, revealed, kvkId, campaignName, statsCurrent, rows, primaryRow, primaryStats };
}

export default useMyKvkGoals;
