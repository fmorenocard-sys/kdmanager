import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { useData } from '../../context/DataContext';
import { ChevronDown, ChevronUp, Search } from '../ui/icons';

// F-020 / US-019 — vue « Joueurs » de la course : top 200 du scan courant, recherche,
// tri par colonne, et croisement avec les profils 2997 (badge « membre »).
//
// BR-010 : on est ici dans le domaine coalition. Aucune donnée du DKP interne n'est
// affichée à côté du DKP de course — le croisement 2997 ne sert qu'à identifier les
// nôtres dans la masse des 32 royaumes, pas à comparer les deux barèmes.

const fmtCompact = (num) => {
    if (num == null) return '—';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
};

// Efficacité (F-020) : DKP de course par million de puissance. Même définition que
// `dkp_per_mpower` côté moteur (engine.js), appliquée au joueur au lieu du royaume.
const efficiency = (p) => {
    if (!p.latest_power || !p.dkp_net) return null;
    return p.dkp_net / (p.latest_power / 1e6);
};

const COLUMNS = [
    { key: 'rank', labelKey: null, align: 'center', sortable: false },
    { key: 'name', labelKey: 'kvk_race.player_col', align: 'start', sortable: true },
    { key: 'kingdom', labelKey: 'kvk_race.kingdom_col', align: 'start', sortable: true },
    { key: 'dkp_net', labelKey: 'kvk_race.dkp_col', align: 'end', sortable: true },
    { key: 'net_kill_points_diff', labelKey: 'kvk_race.kp_col', align: 'end', sortable: true },
    { key: 'net_dead_diff', labelKey: 'kvk_race.deads_col', align: 'end', sortable: true },
    { key: 'latest_power', labelKey: 'kvk_race.power_col', align: 'end', sortable: true },
    { key: 'efficiency', labelKey: 'kvk_race.eff_col', align: 'end', sortable: true }
];

const RacePlayersView = ({ players, pinned = [], labels = {}, roleClass, roles = {} }) => {
    const { t } = useTranslation();
    const { players: kdPlayers } = useData();
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'dkp_net', dir: 'desc' });
    const [onlyOurs, setOnlyOurs] = useState(false);

    // Index des gouverneurs 2997 : identifie les nôtres dans le top coalition.
    const memberIds = useMemo(
        () => new Set((kdPlayers || []).map((p) => String(p.id))),
        [kdPlayers]
    );

    const rows = useMemo(() => {
        const withDerived = (players || []).map((p, i) => ({
            ...p,
            sourceRank: i + 1,
            efficiency: efficiency(p),
            isMember: memberIds.has(String(p.governor_id))
        }));

        const q = search.trim().toLowerCase();
        const filtered = withDerived.filter((p) => {
            if (onlyOurs && !p.isMember) return false;
            if (!q) return true;
            return String(p.name || '').toLowerCase().includes(q)
                || String(p.governor_id || '').includes(q)
                || String(p.kingdom || '').includes(q);
        });

        const { key, dir } = sort;
        const factor = dir === 'asc' ? 1 : -1;
        return [...filtered].sort((a, b) => {
            const va = a[key];
            const vb = b[key];
            if (va == null && vb == null) return 0;
            if (va == null) return 1;   // les valeurs manquantes finissent toujours en bas
            if (vb == null) return -1;
            if (typeof va === 'string' || typeof vb === 'string') {
                return String(va).localeCompare(String(vb)) * factor;
            }
            return (va - vb) * factor;
        });
    }, [players, search, sort, onlyOurs, memberIds]);

    const toggleSort = (key) => {
        setSort((prev) => prev.key === key
            ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
            : { key, dir: 'desc' });
    };

    const memberCount = useMemo(() => rows.filter((p) => p.isMember).length, [rows]);

    if (!players?.length) {
        return (
            <div className="px-4 md:px-6 py-10 text-center text-sm text-slate-400">
                {t('kvk_race.players_empty')}
            </div>
        );
    }

    return (
        <>
            {/* Barre d'outils */}
            <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 pb-3">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label={t('kvk_race.players_search')}
                        placeholder={t('kvk_race.players_search_placeholder')}
                        className="w-full ps-9 pe-3 py-2 text-sm rounded-lg bg-[var(--surface-input)] border border-[var(--border-flat)] text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setOnlyOurs((v) => !v)}
                    aria-pressed={onlyOurs}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${onlyOurs
                        ? 'text-amber-300 bg-amber-500/15 border-amber-500/40'
                        : 'text-slate-400 bg-[var(--surface-input)] border-[var(--border-flat)] hover:text-white'}`}
                >
                    {t('kvk_race.players_only_ours')}
                </button>
                <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                    {t('kvk_race.players_count', { shown: rows.length, total: players.length, members: memberCount })}
                </span>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3 px-4 pb-4">
                {rows.map((p) => (
                    <div
                        key={p.governor_id}
                        className={`bg-[var(--surface-solid)] p-3 rounded-xl border ${p.isMember ? 'border-amber-500/40' : 'border-[var(--border-flat)]'} flex flex-col gap-2`}
                    >
                        <div className="flex justify-between items-start gap-2 border-b border-[var(--border-flat)] pb-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="bg-slate-900 text-slate-400 text-xs font-bold px-2 py-1 rounded shrink-0">#{p.sourceRank}</span>
                                    <span className="font-bold text-white text-sm truncate">{p.name || `#${p.governor_id}`}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-1">
                                    KD {p.kingdom} · {p.governor_id}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] border ${roleClass(roles[p.camp])}`}>
                                    {labels[p.camp] || p.camp}
                                </span>
                                {p.isMember && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/30">
                                        {t('kvk_race.member_badge')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('kvk_race.dkp_col')}</span><span className="font-mono font-bold text-white">{fmtCompact(p.dkp_net)}</span></div>
                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('kvk_race.deads_col')}</span><span className="font-mono text-red-400">{fmtCompact(p.net_dead_diff)}</span></div>
                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('kvk_race.power_col')}</span><span className="font-mono text-slate-300">{fmtCompact(p.latest_power)}</span></div>
                            <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('kvk_race.eff_col')}</span><span className="font-mono text-indigo-300">{p.efficiency == null ? '—' : fmtCompact(p.efficiency)}</span></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-900/80 sticky top-0 z-10">
                        <TableRow>
                            {COLUMNS.map((col) => {
                                const active = sort.key === col.key;
                                const alignClass = col.align === 'end' ? 'text-right' : col.align === 'center' ? 'text-center' : '';
                                if (!col.sortable) {
                                    return <TableHead key={col.key} className={`w-12 text-xs ${alignClass}`}>#</TableHead>;
                                }
                                return (
                                    <TableHead key={col.key} className={`text-xs ${alignClass}`}>
                                        <button
                                            type="button"
                                            onClick={() => toggleSort(col.key)}
                                            aria-label={t(col.labelKey)}
                                            className={`inline-flex items-center gap-1 hover:text-white transition-colors ${active ? 'text-white' : ''}`}
                                        >
                                            {t(col.labelKey)}
                                            {/* UXA11Y-004 : l'icône de tri reste visible sans survol */}
                                            {active
                                                ? (sort.dir === 'desc' ? <ChevronDown size={12} weight="fill" /> : <ChevronUp size={12} weight="fill" />)
                                                : <ChevronDown size={12} className="opacity-40" />}
                                        </button>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((p) => (
                            <TableRow
                                key={p.governor_id}
                                className={`hover:bg-white/5 border-b border-white/5 ${p.isMember ? 'bg-amber-500/5' : ''}`}
                            >
                                <TableCell className="text-center text-xs font-mono text-slate-500">#{p.sourceRank}</TableCell>
                                <TableCell className="text-sm text-white max-w-[220px]">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-semibold truncate">{p.name || `#${p.governor_id}`}</span>
                                        {p.isMember && (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/30">
                                                {t('kvk_race.member_badge')}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-mono">{p.governor_id}</span>
                                </TableCell>
                                <TableCell className="text-sm whitespace-nowrap">
                                    <span className="text-slate-300 font-mono text-xs">KD {p.kingdom}</span>
                                    {pinned.includes(Number(p.kingdom)) && (
                                        <span className="ms-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/30">
                                            {t('kvk_race.pinned_badge')}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm font-bold text-white">{fmtCompact(p.dkp_net)}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-slate-300">{fmtCompact(p.net_kill_points_diff)}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-red-400">{fmtCompact(p.net_dead_diff)}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-slate-400">{fmtCompact(p.latest_power)}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-indigo-300">{p.efficiency == null ? '—' : fmtCompact(p.efficiency)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
};

export default RacePlayersView;
