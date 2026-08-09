import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { BRANDING } from '../../config/branding';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useRole, ROLES } from '../../context/RoleContext';
import { computeKvkGoals, DEAD_POINTS_PER_T5 } from '../../lib/kvkGoals';
import { rateFromGoalPct, RATES } from '../../lib/kvkScoring';
import { sortRows, nextSort } from '../../lib/sortRows';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import SortHead from '../ui/SortHead';
import Card from '../ui/Card';
import { Search, AlertTriangle, Target } from '../ui/icons';

// F-014 / US-009 — objectifs de campagne des joueurs qui ont déclaré.
//
// La question à laquelle répond cet onglet : « pour cette campagne, qui doit
// atteindre quoi ? ». On part donc des déclarations de disponibilité, pas du
// roster complet : un joueur qui n'a pas déclaré n'a pas d'objectif à suivre ici,
// et c'est précisément l'information qui manque au leadership.
//
// Le statut affiché est ABSOLU (seuils fixes sur le taux d'atteinte du KP Goal) et
// non la note relative de fin de campagne, qui n'existe qu'une fois la cohorte
// complète et ferait bouger l'objectif d'un joueur selon les résultats des autres.
//
// Domaine interne 2997 (BR-010) : sans rapport avec le DKP de course de la coalition.

const fmt = (n, digits = 1) => {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(n);
};

const RATE_STYLES = {
    [RATES.EXCELLENT]: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    [RATES.GOOD]: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
    [RATES.NEED_IMPROVEMENT]: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    [RATES.DEADWEIGHT]: 'text-red-400 bg-red-500/10 border-red-500/30'
};

const rateKey = (rate) => `goals.rate_${rate.toLowerCase().replace(/\s+/g, '_')}`;

const RateBadge = ({ rate, revealed, t }) => {
    // Statuts masqués tant que le Roi ne les a pas révélés (fin des combats, Option B) :
    // une pastille « Deadweight » en pleine campagne est mal interprétée par les joueurs
    // (l'objectif n'est atteignable qu'une fois les batailles jouées). Voir BR-019.
    if (!revealed) return <span className="text-slate-600" title={t('goals.status_hidden_notice')}>—</span>;
    if (!rate) return <span className="text-slate-600">—</span>;
    return (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${RATE_STYLES[rate]}`}>
            {t(rateKey(rate))}
        </span>
    );
};

const KvkGoalsPanel = () => {
    const { t } = useTranslation();
    const { currentUser, governorId } = useAuth();
    const { players, kvkStats, kvkFillerStats } = useData();
    const { isAuthorized } = useRole();
    const isLeadership = isAuthorized([ROLES.KING, ROLES.OFFICER]);

    const [declarations, setDeclarations] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [config, setConfig] = useState(null); // F-027 : kvk_config (fillerDeathRatio)
    const [kvkId, setKvkId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'goalKp', dir: 'desc' });
    // Vue « Déclarants » (défaut) vs « Top du royaume » (leadership, F-029) : objectifs des
    // N plus puissants du roster, indépendamment de toute inscription/déclaration.
    const [viewMode, setViewMode] = useState('declared'); // 'declared' | 'top'
    const [topN, setTopN] = useState(50);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [snap, cfgSnap] = await Promise.all([
                    getDocs(collection(db, 'war_availabilities')),
                    getDoc(doc(db, 'kvk_config', 'current'))
                ]);
                if (cancelled) return;

                const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setDeclarations(list);

                const cfg = cfgSnap.exists() ? cfgSnap.data() : null;
                setConfig(cfg);
                const map = {};
                if (cfg?.id) map[cfg.id] = { id: cfg.id, name: cfg.name || cfg.id };
                list.forEach((d) => {
                    if (d.kvkId && !map[d.kvkId]) map[d.kvkId] = { id: d.kvkId, name: d.kvkName || d.kvkId };
                });
                const all = Object.values(map);
                setCampaigns(all);
                setKvkId((prev) => prev || cfg?.id || all[0]?.id || '');
            } catch (err) {
                console.error('KvkGoalsPanel load error:', err);
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Index puissance / performance par ID de gouverneur. Les fillers comptent :
    // ils déclarent aussi et ont les mêmes objectifs.
    const statsById = useMemo(() => {
        const index = new Map();
        [...(kvkStats || []), ...(kvkFillerStats || [])].forEach((k) => index.set(String(k.id), k));
        return index;
    }, [kvkStats, kvkFillerStats]);

    const powerById = useMemo(() => {
        const index = new Map();
        (players || []).forEach((p) => index.set(String(p.id), p.power));
        return index;
    }, [players]);

    const rows = useMemo(() => {
        // Le lien déclaration → joueur se fait par ID de gouverneur, pas par userId :
        // une déclaration peut être posée en invité (`{kvk}_guest_{gov}`) puis refaite
        // une fois connecté (`{kvk}_{uid}`), ce qui donne deux documents pour le même
        // gouverneur. On garde la plus récente, sinon le joueur apparaîtrait deux fois
        // avec le même objectif.
        const latestByGovernor = new Map();
        declarations
            .filter((d) => (!kvkId || d.kvkId === kvkId) && d.governorId)
            .forEach((d) => {
                const gid = String(d.governorId);
                const previous = latestByGovernor.get(gid);
                const stamp = d.updatedAt?.seconds ?? 0;
                if (!previous || stamp >= (previous.updatedAt?.seconds ?? 0)) {
                    latestByGovernor.set(gid, d);
                }
            });

        const built = [...latestByGovernor.values()]
            // F-027 : les fillers ont leur propre barème (fillerRows), pas celui-ci.
            .filter((d) => d.accountType !== 'filler')
            .map((d) => {
                const gid = String(d.governorId || '');
                const kvk = statsById.get(gid) || null;
                // Puissance de DÉBUT de campagne quand elle existe : c'est sur elle
                // que le barème est calé, et elle ne bouge plus une fois le KvK lancé.
                const power = kvk?.initialPower || powerById.get(gid) || 0;
                const goals = computeKvkGoals(power);
                const kpGained = kvk?.totalKpGained ?? null;
                const goalPct = (kpGained != null && goals.goalKp > 0)
                    ? kpGained / (goals.goalKp * 1e6)
                    : null;
                const { rate, uncertain } = rateFromGoalPct(goalPct);

                return {
                    key: d.id,
                    governorId: gid,
                    // Nom FRAIS du scan prioritaire sur le libellé figé à la déclaration :
                    // un joueur qui se renomme in-game (ex. Helios -> Bochica) doit refléter
                    // son nom courant, cohérent avec le leaderboard. Repli sur le libellé
                    // déclaré (déclaration invité hors roster), puis l'ID.
                    name: kvk?.name || d.governorName || gid,
                    isMe: gid && gid === String(governorId || ''),
                    powerM: goals.powerM,
                    minKp: goals.minKp,
                    goalKp: goals.goalKp,
                    minDead: goals.minDead,
                    minDeadTroops: goals.minDeadApproxTroops,
                    hasPower: power > 0,
                    // L'ID est-il connu du royaume ? Sépare « ID introuvable » de
                    // « joueur connu mais sans puissance remontée ».
                    knownPlayer: !!kvk || powerById.has(gid),
                    outOfDomain: goals.outOfDomain,
                    kpGained,
                    goalPct,
                    rate,
                    uncertain
                };
            });

        // Un joueur sans rôle de commandement ne voit que sa propre ligne : ces
        // objectifs sont nominatifs, il n'y a pas de raison de les exposer à tous.
        const scoped = isLeadership ? built : built.filter((r) => r.isMe);

        const q = search.trim().toLowerCase();
        const filtered = q
            ? scoped.filter((r) => r.name.toLowerCase().includes(q) || r.governorId.includes(q))
            : scoped;

        return sortRows(filtered, sort);
    }, [declarations, kvkId, statsById, powerById, governorId, isLeadership, search, sort]);

    // F-027 : objectifs des comptes filler. Barème dédié (BR-018), jamais mélangé
    // au barème puissance des comptes de guerre : pouvoir déclaré = 4×T4 + 10×T5 ;
    // objectif de perte = ratio (par campagne, défaut 0.5) × pouvoir déclaré ;
    // réalisé = 4×t4Dead + 10×t5Dead (depuis kvk_filler) ; atteinte = réalisé/objectif.
    const fillerRows = useMemo(() => {
        const ratio = config?.fillerDeathRatio ?? 0.5;
        const latest = new Map();
        declarations
            .filter((d) => (!kvkId || d.kvkId === kvkId) && d.governorId && d.accountType === 'filler')
            .forEach((d) => {
                const gid = String(d.governorId);
                const prev = latest.get(gid);
                const stamp = d.updatedAt?.seconds ?? 0;
                if (!prev || stamp >= (prev.updatedAt?.seconds ?? 0)) latest.set(gid, d);
            });
        const built = [...latest.values()].map((d) => {
            const gid = String(d.governorId);
            const kvk = statsById.get(gid) || null;
            const t4 = d.filler?.t4 || 0;
            const t5 = d.filler?.t5 || 0;
            const declaredPower = t4 * 4 + t5 * 10;
            const target = ratio * declaredPower;
            const achieved = (Number(kvk?.t4Dead) || 0) * 4 + (Number(kvk?.t5Dead) || 0) * 10;
            const attainment = target > 0 ? achieved / target : null;
            const { rate } = rateFromGoalPct(attainment);
            return {
                key: d.id, governorId: gid,
                name: kvk?.name || d.governorName || gid,
                isMe: gid === String(governorId || ''),
                t4, t5, declaredPower, target, achieved, attainment, rate,
            };
        });
        const scoped = isLeadership ? built : built.filter((r) => r.isMe);
        const q = search.trim().toLowerCase();
        return q ? scoped.filter((r) => r.name.toLowerCase().includes(q) || r.governorId.includes(q)) : scoped;
    }, [declarations, kvkId, statsById, config, governorId, isLeadership, search]);

    // Vue « Top du royaume » (F-029) : objectifs des N plus puissants du roster, pris de
    // static_data/kvk (initialPower figé = référence, totalKpGained = KP gagné du KvK).
    // Aucune dépendance aux déclarations — un joueur non inscrit a quand même sa cible.
    const topRows = useMemo(() => {
        if (!isLeadership || viewMode !== 'top') return [];
        const built = (kvkStats || [])
            .filter((k) => (k.initialPower || 0) > 0)
            .sort((a, b) => (b.initialPower || 0) - (a.initialPower || 0))
            .slice(0, topN)
            .map((k) => {
                const power = k.initialPower || 0;
                const goals = computeKvkGoals(power);
                const kpGained = k.totalKpGained ?? null;
                const goalPct = (kpGained != null && goals.goalKp > 0) ? kpGained / (goals.goalKp * 1e6) : null;
                const { rate, uncertain } = rateFromGoalPct(goalPct);
                const gid = String(k.id);
                return {
                    key: 'top_' + gid, governorId: gid, name: k.name || gid,
                    isMe: gid === String(governorId || ''),
                    powerM: goals.powerM, minKp: goals.minKp, goalKp: goals.goalKp,
                    minDead: goals.minDead, minDeadTroops: goals.minDeadApproxTroops,
                    hasPower: power > 0, knownPlayer: true, outOfDomain: goals.outOfDomain,
                    kpGained, goalPct, rate, uncertain
                };
            });
        const q = search.trim().toLowerCase();
        const filtered = q ? built.filter((r) => r.name.toLowerCase().includes(q) || r.governorId.includes(q)) : built;
        return sortRows(filtered, sort);
    }, [kvkStats, viewMode, topN, isLeadership, governorId, search, sort]);

    const displayRows = viewMode === 'top' ? topRows : rows;

    // Option B (BR-019) : le Roi révèle les statuts d'objectifs une fois les combats
    // terminés, via un interrupteur dédié (`kvk_config.revealGoalStatus`), indépendant
    // de la clôture/archivage. Défaut absent → masqués (safe pendant la campagne).
    const revealStatus = config?.revealGoalStatus === true;

    // Nommer les joueurs non rattachés : un simple compteur n'est pas actionnable,
    // le Roi doit savoir quel ID vérifier. On distingue aussi les deux causes —
    // l'ID ne correspond à personne (saisie erronée, ou joueur hors Top 300), ou il
    // correspond mais la puissance est absente du profil.
    const unresolved = useMemo(() => displayRows.filter((r) => !r.hasPower).map((r) => ({
        name: r.name,
        governorId: r.governorId,
        cause: r.knownPlayer ? 'no_power' : 'unknown_id'
    })), [displayRows]);
    const toggleSort = (key) => setSort((prev) => nextSort(prev, key));

    // Copier la sélection courante (Top N + recherche) en texte prêt à coller dans un mail
    // in-game ou sur Discord. Format NEUTRE en langue (symboles) — le royaume est multilingue.
    const copyList = async () => {
        const title = viewMode === 'top' ? `Top ${topN} — ${BRANDING.kingdomName}` : `KvK — ${BRANDING.kingdomName}`;
        const lines = displayRows.map((r, i) => `${i + 1}. ${r.name} (${fmt(r.powerM)}M) · KP ${fmt(r.goalKp)}M · ☠ ${fmt(r.minDead)}M`);
        try {
            await navigator.clipboard.writeText([title, ...lines].join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('copy list failed:', e);
        }
    };

    if (!currentUser) {
        return <Card className="p-6 text-center"><p className="text-sm text-slate-400">{t('goals.login_required')}</p></Card>;
    }
    if (loading) {
        return <Card className="p-6 text-center"><p className="text-sm text-slate-400">{t('common.loading')}</p></Card>;
    }
    if (error) {
        return <Card className="p-6 text-center"><p className="text-sm text-red-400">{t('goals.load_error')}</p></Card>;
    }

    return (
        <div className="space-y-4">
            {/* Sélecteur de campagne + recherche */}
            <div className="flex flex-wrap items-center gap-2">
                {campaigns.length > 0 && (
                    <select
                        aria-label={t('goals.campaign_label')}
                        value={kvkId}
                        onChange={(e) => setKvkId(e.target.value)}
                        className="bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-lg px-3 py-2 text-sm text-slate-200 min-h-[44px] w-full sm:w-auto min-w-0 max-w-full"
                    >
                        {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
                {isLeadership && (
                    <div className="inline-flex rounded-lg border border-[var(--border-flat)] overflow-hidden">
                        <button type="button" onClick={() => setViewMode('declared')}
                            className={`px-3 py-2 text-sm min-h-[44px] ${viewMode === 'declared' ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:text-white'}`}>
                            {t('goals.view_declared')}
                        </button>
                        <button type="button" onClick={() => setViewMode('top')}
                            className={`px-3 py-2 text-sm min-h-[44px] ${viewMode === 'top' ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:text-white'}`}>
                            {t('goals.view_top')}
                        </button>
                    </div>
                )}
                {isLeadership && viewMode === 'top' && (
                    <select
                        aria-label={t('goals.top_n_label')}
                        value={topN}
                        onChange={(e) => setTopN(Number(e.target.value))}
                        className="bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-lg px-3 py-2 text-sm text-slate-200 min-h-[44px]"
                    >
                        {[25, 50, 100, 300].map((n) => <option key={n} value={n}>{t('goals.top_n_option', { n })}</option>)}
                    </select>
                )}
                {isLeadership && (
                    <div className="relative flex-1 min-w-[180px]">
                        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label={t('goals.search')}
                            placeholder={t('goals.search_placeholder')}
                            className="w-full ps-9 pe-3 py-2 min-h-[44px] text-sm rounded-lg bg-[var(--surface-input)] border border-[var(--border-flat)] text-white placeholder:text-slate-600"
                        />
                    </div>
                )}
                <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                    {viewMode === 'top'
                        ? t('goals.top_count', { count: displayRows.length })
                        : t('goals.declared_count', { count: rows.length })}
                </span>
                {isLeadership && displayRows.length > 0 && (
                    <button
                        type="button"
                        onClick={copyList}
                        className="ms-auto inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-sm rounded-lg border border-[var(--border-flat)] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                    >
                        {copied ? t('goals.copied') : t('goals.copy_list')}
                    </button>
                )}
            </div>

            {displayRows.length === 0 && (viewMode === 'top' || fillerRows.length === 0) && (
                <Card className="p-6 text-center">
                    <p className="text-sm text-slate-400">
                        {viewMode === 'top'
                            ? t('goals.empty_top')
                            : (isLeadership ? t('goals.empty_campaign') : t('goals.empty_self'))}
                    </p>
                </Card>
            )}

            {/* Option B (BR-019) : statuts non révélés → on l'explique, pour ne pas laisser
                croire à un bug ou à une absence de données. */}
            {!revealStatus && (displayRows.length > 0 || fillerRows.length > 0) && (
                <div className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-500/10 border border-slate-500/30 rounded-lg p-3">
                    <Target size={16} className="shrink-0 mt-0.5 text-slate-400" />
                    <p>{t('goals.status_hidden_notice')}</p>
                </div>
            )}

            {displayRows.length > 0 && (
                <Card className="p-0 overflow-hidden">
                    {/* Cartes en mobile — pas de scroll horizontal (UXA11Y-001) */}
                    <div className="md:hidden flex flex-col gap-3 p-4">
                        {displayRows.map((r) => (
                            <div key={r.key} className={`bg-[var(--surface-solid)] p-3 rounded-xl border ${r.isMe ? 'border-amber-500/40' : 'border-[var(--border-flat)]'} flex flex-col gap-2`}>
                                <div className="flex justify-between items-start gap-2 border-b border-[var(--border-flat)] pb-2">
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-sm truncate">{r.name}</p>
                                        <p className="text-[11px] text-slate-500 font-mono">{r.governorId} · {fmt(r.powerM)} M</p>
                                    </div>
                                    <RateBadge rate={r.rate} revealed={revealStatus} t={t} />
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="flex flex-col bg-[var(--border-flat)] p-1.5 rounded">
                                        <span className="text-slate-500 text-[10px]">{t('goals.min_kp')}</span>
                                        <span className="font-mono text-slate-200">{fmt(r.minKp)}M</span>
                                    </div>
                                    <div className="flex flex-col bg-[var(--border-flat)] p-1.5 rounded">
                                        <span className="text-slate-500 text-[10px]">{t('goals.goal_kp')}</span>
                                        <span className="font-mono font-bold text-white">{fmt(r.goalKp)}M</span>
                                    </div>
                                    <div className="flex flex-col bg-[var(--border-flat)] p-1.5 rounded">
                                        <span className="text-slate-500 text-[10px]">{t('goals.min_dead')}</span>
                                        <span className="font-mono text-red-400">{fmt(r.minDead)}M</span>
                                    </div>
                                </div>
                                {r.goalPct != null && (
                                    <p className="text-[11px] text-slate-400 font-mono">
                                        {t('goals.goal_attainment', { pct: fmt(r.goalPct * 100, 0) })}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Table en desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-900/80 sticky top-0 z-10">
                                <TableRow>
                                    <SortHead label={t('goals.player')} sortKey="name" sort={sort} onSort={toggleSort} />
                                    <SortHead label={t('goals.reference_power')} sortKey="powerM" sort={sort} onSort={toggleSort} align="end" />
                                    <SortHead label={t('goals.min_kp')} sortKey="minKp" sort={sort} onSort={toggleSort} align="end" />
                                    <SortHead label={t('goals.goal_kp')} sortKey="goalKp" sort={sort} onSort={toggleSort} align="end" />
                                    <SortHead label={t('goals.min_dead')} sortKey="minDead" sort={sort} onSort={toggleSort} align="end" />
                                    <SortHead label={t('goals.attainment')} sortKey="goalPct" sort={sort} onSort={toggleSort} align="end" />
                                    <TableHead className="text-xs">{t('goals.status')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayRows.map((r) => (
                                    <TableRow key={r.key} className={`hover:bg-white/5 border-b border-white/5 ${r.isMe ? 'bg-amber-500/5' : ''}`}>
                                        <TableCell className="text-sm text-white max-w-[220px]">
                                            <span className="font-semibold truncate block">{r.name}</span>
                                            <span className="text-[11px] text-slate-500 font-mono">{r.governorId}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-400">
                                            {r.hasPower ? `${fmt(r.powerM)} M` : '—'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-300">{fmt(r.minKp)} M</TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold text-white">{fmt(r.goalKp)} M</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-red-400">
                                            {fmt(r.minDead)} M
                                            <span className="block text-[10px] text-slate-600">≈ {fmt(r.minDeadTroops / 1000, 0)} k T5</span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-300">
                                            {r.goalPct == null ? '—' : `${fmt(r.goalPct * 100, 0)} %`}
                                        </TableCell>
                                        <TableCell><RateBadge rate={r.rate} revealed={revealStatus} t={t} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}

            {/* F-027 : objectifs des comptes filler (barème T4/T5 dédié). Masqués en vue « Top du royaume ». */}
            {viewMode === 'declared' && fillerRows.length > 0 && (
                <Card className="p-0 overflow-hidden border border-amber-500/20">
                    <h3 className="p-4 text-base font-bold text-amber-400 border-b border-[var(--border-flat)]">
                        {t('goals.filler_section')} ({fillerRows.length})
                    </h3>
                    {/* Cartes mobile */}
                    <div className="md:hidden flex flex-col gap-3 p-4">
                        {fillerRows.map((r) => (
                            <div key={r.key} className={`bg-[var(--surface-solid)] p-3 rounded-xl border ${r.isMe ? 'border-amber-500/40' : 'border-[var(--border-flat)]'} flex flex-col gap-2`}>
                                <div className="flex justify-between items-start gap-2 border-b border-[var(--border-flat)] pb-2">
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-sm truncate">{r.name}</p>
                                        <p className="text-[11px] text-slate-500 font-mono">{r.governorId}</p>
                                    </div>
                                    <RateBadge rate={r.rate} revealed={revealStatus} t={t} />
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="flex flex-col bg-[var(--border-flat)] p-1.5 rounded">
                                        <span className="text-slate-500 text-[10px]">{t('goals.declared_power')}</span>
                                        <span className="font-mono text-slate-200">{Math.round(r.declaredPower).toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col bg-[var(--border-flat)] p-1.5 rounded">
                                        <span className="text-slate-500 text-[10px]">{t('goals.dead_target')}</span>
                                        <span className="font-mono font-bold text-white">{Math.round(r.target).toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col bg-[var(--border-flat)] p-1.5 rounded">
                                        <span className="text-slate-500 text-[10px]">{t('goals.achieved')}</span>
                                        <span className="font-mono text-red-400">{Math.round(r.achieved).toLocaleString()}</span>
                                    </div>
                                </div>
                                {r.attainment != null && (
                                    <p className="text-[11px] text-slate-400 font-mono">{t('goals.goal_attainment', { pct: fmt(r.attainment * 100, 0) })}</p>
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Table desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-900/80">
                                <TableRow>
                                    <TableHead className="text-xs !normal-case">{t('goals.player')}</TableHead>
                                    <TableHead className="text-xs text-end !normal-case">{t('goals.declared_power')}</TableHead>
                                    <TableHead className="text-xs text-end !normal-case">{t('goals.dead_target')}</TableHead>
                                    <TableHead className="text-xs text-end !normal-case">{t('goals.achieved')}</TableHead>
                                    <TableHead className="text-xs text-end !normal-case">{t('goals.attainment')}</TableHead>
                                    <TableHead className="text-xs">{t('goals.status')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fillerRows.map((r) => (
                                    <TableRow key={r.key} className={`hover:bg-white/5 border-b border-white/5 ${r.isMe ? 'bg-amber-500/5' : ''}`}>
                                        <TableCell className="text-sm text-white max-w-[220px]">
                                            <span className="font-semibold truncate block">{r.name}</span>
                                            <span className="text-[11px] text-slate-500 font-mono">{r.governorId}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-300">{Math.round(r.declaredPower).toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold text-white">{Math.round(r.target).toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-red-400">{Math.round(r.achieved).toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-300">{r.attainment == null ? '—' : `${fmt(r.attainment * 100, 0)} %`}</TableCell>
                                        <TableCell><RateBadge rate={r.rate} revealed={revealStatus} t={t} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}

            {unresolved.length > 0 && (
                <div className="flex items-start gap-2.5 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    <div className="min-w-0">
                        <p className="mb-1.5">{t('goals.warn_missing_power', { count: unresolved.length })}</p>
                        <ul className="flex flex-col gap-1">
                            {unresolved.map((u) => (
                                <li key={u.governorId} className="font-mono text-[11px] text-amber-100/80">
                                    {u.name} — <span className="text-amber-300">{u.governorId || t('goals.no_governor_id')}</span>
                                    <span className="text-amber-200/60 font-sans"> · {t(`goals.cause_${u.cause}`)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                <Target size={12} className="shrink-0 mt-0.5" />
                <span>
                    {t('goals.footnote', { kingdom: BRANDING.kingdomNumber })} {t('goals.dead_points_note', { points: DEAD_POINTS_PER_T5 })}
                </span>
            </p>
        </div>
    );
};

export default KvkGoalsPanel;
