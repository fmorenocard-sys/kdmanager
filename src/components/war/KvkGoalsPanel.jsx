import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
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

const RateBadge = ({ rate, t }) => {
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
    const [kvkId, setKvkId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'goalKp', dir: 'desc' });

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
                    name: d.governorName || kvk?.name || gid,
                    isMe: gid && gid === String(governorId || ''),
                    powerM: goals.powerM,
                    minKp: goals.minKp,
                    goalKp: goals.goalKp,
                    minDead: goals.minDead,
                    minDeadTroops: goals.minDeadApproxTroops,
                    hasPower: power > 0,
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

    const missingPower = rows.filter((r) => !r.hasPower).length;
    const toggleSort = (key) => setSort((prev) => nextSort(prev, key));

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
                    {t('goals.declared_count', { count: rows.length })}
                </span>
            </div>

            {rows.length === 0 && (
                <Card className="p-6 text-center">
                    <p className="text-sm text-slate-400">
                        {isLeadership ? t('goals.empty_campaign') : t('goals.empty_self')}
                    </p>
                </Card>
            )}

            {rows.length > 0 && (
                <Card className="p-0 overflow-hidden">
                    {/* Cartes en mobile — pas de scroll horizontal (UXA11Y-001) */}
                    <div className="md:hidden flex flex-col gap-3 p-4">
                        {rows.map((r) => (
                            <div key={r.key} className={`bg-[var(--surface-solid)] p-3 rounded-xl border ${r.isMe ? 'border-amber-500/40' : 'border-[var(--border-flat)]'} flex flex-col gap-2`}>
                                <div className="flex justify-between items-start gap-2 border-b border-[var(--border-flat)] pb-2">
                                    <div className="min-w-0">
                                        <p className="font-bold text-white text-sm truncate">{r.name}</p>
                                        <p className="text-[11px] text-slate-500 font-mono">{r.governorId} · {fmt(r.powerM)} M</p>
                                    </div>
                                    <RateBadge rate={r.rate} t={t} />
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
                                {rows.map((r) => (
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
                                        <TableCell><RateBadge rate={r.rate} t={t} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}

            {missingPower > 0 && (
                <div className="flex items-start gap-2.5 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    <p>{t('goals.warn_missing_power', { count: missingPower })}</p>
                </div>
            )}

            <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                <Target size={12} className="shrink-0 mt-0.5" />
                <span>
                    {t('goals.footnote')} {t('goals.dead_points_note', { points: DEAD_POINTS_PER_T5 })}
                </span>
            </p>
        </div>
    );
};

export default KvkGoalsPanel;
