import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { computeKvkGoals, computeFillerGoal } from '../lib/kvkGoals';
import { rateFromGoalPct } from '../lib/kvkScoring';

/**
 * F-032 / F-014 / F-027 — objectif & stats KvK de l'UTILISATEUR COURANT, exposés
 * sans dépendance à un composant de table (spec Espace_Perso §5.2).
 *
 * Chargement des données : `config` (kvk_config/current) et `fillerDecls` (stacks
 * T4/T5 déclarés par gid) sont FOURNIS par l'appelant (MeLandingPage), qui les lit
 * déjà pour composer la page — le hook ne relit donc PAS ces docs (une seule lecture
 * Firestore par montage de /me). Le hook ne lit que `kvk_history` (archives figées),
 * dont il est le seul consommateur ici.
 *
 * Sélecteur de campagne (F-032) : la campagne COURANTE lit les stats live
 * (static_data/kvk) ; les campagnes PASSÉES lisent leur copie FIGÉE dans
 * kvk_history (données par campagne, cohérentes). Expose `campaigns`,
 * `selectedKey`, `selectCampaign`.
 *
 * Cohérence de la campagne courante : `static_data/kvk` ne porte aucun id de
 * campagne — si le scan live est en réalité encore celui de la dernière campagne
 * archivée (mêmes chiffres) ou si la campagne n'a pas commencé, l'objectif courant
 * est « pas encore publié » (statsCurrent=false) plutôt que d'afficher des chiffres
 * périmés. Les campagnes passées, elles, sont toujours « publiées » (figées).
 *
 * BR-019 : `revealed` gate le LABEL de statut (jamais les chiffres). Une campagne
 * passée est toujours révélée (combats terminés).
 *
 * Barème filler : dépend des stacks T4/T5 DÉCLARÉS (war_availabilities), qui
 * n'existent que pour la campagne courante → pas d'objectif filler pour le passé.
 *
 * @param {object} [args]
 * @param {object|null} [args.config] doc `kvk_config/current` déjà chargé par l'appelant.
 * @param {Object<string,{t4:number,t5:number}>} [args.fillerDecls] stacks filler
 *   déclarés, indexés par id de gouverneur, dérivés des war_availabilities déjà lues.
 */
export function useMyKvkGoals({ config = null, fillerDecls = {} } = {}) {
    const { currentUser, governorId, accounts } = useAuth();
    const { kvkStats, kvkFillerStats } = useData();

    const [loading, setLoading] = useState(true);
    const [archives, setArchives] = useState([]); // [{ key, name, order, archivedAt, byId:Map }]
    const [selectedKey, setSelectedKey] = useState('current');

    useEffect(() => {
        let alive = true;
        (async () => {
            // Réservé aux utilisateurs connectés (comme MeLandingPage, qui redirige
            // les visiteurs vers /royaume avant tout).
            if (!currentUser) { setArchives([]); setLoading(false); return; }
            setLoading(true);
            // Toutes les campagnes archivées (récentes) : chacune porte une copie
            // FIGÉE du scan (list/fillerList) → source par campagne pour le passé,
            // et la plus récente sert de signal de cohérence de la campagne courante.
            try {
                const aSnap = await getDocs(query(collection(db, 'kvk_history'), orderBy('order', 'desc'), limit(12)));
                if (!alive) return;
                const list = aSnap.docs.map((d) => {
                    const data = d.data();
                    const byId = new Map();
                    [...(data.list || []), ...(data.fillerList || [])].forEach((k) => byId.set(String(k.id), k));
                    return { key: d.id, name: data.title || d.id, order: data.order || 0, archivedAt: data.archivedAt || null, byId };
                });
                setArchives(list);
            } catch (e) {
                console.warn('[useMyKvkGoals] kvk_history indisponible (non bloquant)', e);
                setArchives([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [currentUser]);

    // Index des stats LIVE (campagne courante), par id de gouverneur.
    const statsById = useMemo(() => {
        const m = new Map();
        [...(kvkStats || []), ...(kvkFillerStats || [])].forEach((k) => m.set(String(k.id), k));
        return m;
    }, [kvkStats, kvkFillerStats]);

    const ratio = config?.fillerDeathRatio ?? 0.5;
    const primaryGid = String(governorId || '');

    // ── Cohérence de la campagne COURANTE (cf. en-tête) ────────────────────────
    const latestArchive = archives[0] || null;
    const startDate = config?.startDate?.toDate ? config.startDate.toDate() : null;
    const campaignNotStarted = !!(startDate && startDate.getTime() > new Date().getTime());
    const livePrimary = statsById.get(primaryGid) || null;
    const archPrimary = latestArchive?.byId?.get(primaryGid) || null;
    const scanIsArchived = !!(livePrimary && archPrimary
        && Number(livePrimary.initialPower || 0) > 0
        && Number(livePrimary.initialPower || 0) === Number(archPrimary.initialPower || 0)
        && Number(livePrimary.totalDead || 0) === Number(archPrimary.totalDead || 0));
    const statsCurrent = !(scanIsArchived || campaignNotStarted);

    // ── Sélecteur de campagne ──────────────────────────────────────────────────
    const campaigns = useMemo(() => {
        const cur = config ? [{ key: 'current', name: config.name || null, isCurrent: true }] : [];
        return [...cur, ...archives.map((a) => ({ key: a.key, name: a.name, isCurrent: false }))];
    }, [config, archives]);

    const effectiveKey = campaigns.some((c) => c.key === selectedKey) ? selectedKey : 'current';
    const selectedArchive = archives.find((a) => a.key === effectiveKey) || null;
    const isPast = !!selectedArchive;

    // Source de données de la campagne sélectionnée + son contexte.
    const source = isPast ? selectedArchive.byId : statsById;
    const revealed = isPast ? true : (config?.revealGoalStatus === true);
    const publishedGate = isPast ? true : statsCurrent;
    const campaignName = isPast ? selectedArchive.name : (config?.name || null);

    const rows = useMemo(() => {
        const list = (accounts && accounts.length)
            ? accounts
            : (governorId ? [{ governorId, type: 'war' }] : []);

        return list.map((a) => {
            const gid = String(a.governorId);
            const kvk = source.get(gid) || null;
            const name = kvk?.name || a.name || gid;

            if (a.type === 'filler') {
                // Objectif filler : stacks déclarés — connus seulement pour la
                // campagne COURANTE. Pour une campagne passée : pas d'objectif.
                const decl = isPast ? null : fillerDecls[gid];
                const { declaredPower, target, achieved, attainment } =
                    computeFillerGoal(decl?.t4, decl?.t5, kvk?.t4Dead, kvk?.t5Dead, ratio);
                const { rate, uncertain } = rateFromGoalPct(attainment);
                return {
                    governorId: gid, name, type: 'filler',
                    published: publishedGate && target > 0,
                    declaredPower, target, achieved, pct: attainment, rate, uncertain,
                };
            }

            // Compte de guerre : objectif calé sur la puissance INITIALE figée.
            const power = kvk?.initialPower || 0;
            const goals = computeKvkGoals(power);
            const kpGained = kvk?.totalKpGained ?? null;
            const goalPct = (kpGained != null && goals.goalKp > 0)
                ? kpGained / (goals.goalKp * 1e6)
                : null;
            const { rate, uncertain } = rateFromGoalPct(goalPct);
            return {
                governorId: gid, name, type: 'war',
                published: publishedGate && power > 0,
                powerM: goals.powerM,
                minKp: goals.minKp,
                goalKp: goals.goalKp,
                minDeadTroops: goals.minDeadApproxTroops,
                outOfDomain: goals.outOfDomain,
                kpGained, pct: goalPct, rate, uncertain,
            };
        });
    }, [accounts, governorId, source, fillerDecls, ratio, publishedGate, isPast]);

    const primaryRow = useMemo(() => {
        if (!rows.length) return null;
        return rows.find((r) => r.governorId === primaryGid) || rows[0];
    }, [rows, primaryGid]);

    // Stats condensées PAR COMPTE (Lot 4, parité /mystats sans rank) pour la campagne
    // sélectionnée : power / KP gagné / morts de CHAQUE compte réclamé, indexé par id de
    // gouverneur. Permet à « Mes stats » de suivre le compte choisi dans l'objectif (pas
    // seulement le principal). Vide si non publié (l'appelant gère l'affichage).
    const statsByGid = useMemo(() => {
        const m = new Map();
        if (!publishedGate) return m;
        const list = (accounts && accounts.length) ? accounts : (governorId ? [{ governorId }] : []);
        list.forEach((a) => {
            const p = source.get(String(a.governorId));
            if (!p) return;
            m.set(String(a.governorId), {
                powerM: (Number(p.finalPower) || Number(p.initialPower) || 0) / 1e6,
                kpGainedM: (Number(p.totalKpGained) || 0) / 1e6,
                deaths: Number(p.totalDead) || 0,
            });
        });
        return m;
    }, [accounts, governorId, source, publishedGate]);

    // Compte principal — conservé comme valeur par défaut (parité /mystats).
    const primaryStats = statsByGid.get(primaryGid) || null;

    return {
        loading, revealed, campaignName, statsCurrent, rows, primaryRow, primaryStats, statsByGid,
        campaigns, selectedKey: effectiveKey, selectCampaign: setSelectedKey, isPast,
    };
}

export default useMyKvkGoals;
