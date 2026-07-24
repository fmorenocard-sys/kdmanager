import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import DataRefreshControl from '../components/DataRefreshControl';
import PlayerDetailPanel from '../components/PlayerDetailPanel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Area, Line } from 'recharts';
import { TrendingUp, Users, Skull, Sword, Coins, Coin, Cube, Grains, Trees, Search, Filter, AlertCircle, ArrowUp, ArrowDown, ArrowRight, ArrowUpDown, CastleTurret } from '../components/ui/icons';
import StatCard from '../components/ui/StatCard';
import Avatar from '../components/ui/Avatar';

import PageHeader from '../components/ui/PageHeader';

// Trésorerie (maquette Dashboard Home B) — couleurs par tokens pour le mode clair
const TREASURY_RESOURCES = [
    { key: 'food', icon: Grains, color: 'var(--success)' },
    { key: 'wood', icon: Trees, color: 'var(--warning)' },
    { key: 'stone', icon: Cube, color: 'var(--text-meta)' },
    { key: 'gold', icon: Coin, color: '#f59e0b' },
];

const DashboardPage = () => {
    const { players, history, bank, stats: kingdomStats } = useData();
    const { t } = useTranslation();
    const [sortConfig, setSortConfig] = useState({ key: 'power', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAlliance, setSelectedAlliance] = useState("All");
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    // Filter & Sort Logic
    const alliances = useMemo(() => {
        const unique = new Set(players.map(p => p.alliance).filter(Boolean));
        return ["All", ...Array.from(unique).sort()];
    }, [players]);

    const filteredPlayers = useMemo(() => {
        return players.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(p.id).includes(searchTerm);
            const matchesAlliance = selectedAlliance === "All" || p.alliance === selectedAlliance;
            return matchesSearch && matchesAlliance;
        });
    }, [players, searchTerm, selectedAlliance]);

    const sortedPlayers = useMemo(() => {
        let sorted = [...filteredPlayers];
        sorted.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Force numeric comparison for known number fields to avoid string comparison bugs
            if (['power', 'kp', 'deads', 'rank'].includes(sortConfig.key)) {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredPlayers, sortConfig]);

    const displayedPlayers = useMemo(() => sortedPlayers.slice(0, 100), [sortedPlayers]);

    // Aggregate Stats (based on filtered data if we want dynamic stats, but usually kingdom stats are global)
    // Let's keep cards global for now.
    const stats = useMemo(() => {
        return players.reduce((acc, p) => ({
            power: acc.power + (p.power || 0),
            kp: acc.kp + (p.kp || 0),
            deads: acc.deads + (p.deads || 0)
        }), { power: 0, kp: 0, deads: 0 });
    }, [players]);

    const bankValues = useMemo(() => {
        if (!bank) return null;
        const src = bank.total || bank;
        const vals = {
            food: src.food || 0,
            wood: src.wood || 0,
            stone: src.stone || 0,
            gold: src.gold || 0
        };
        const max = Math.max(...Object.values(vals), 1);
        return { vals, max };
    }, [bank]);

    const formatNumber = (num) => {
        if (!num) return '0';
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // UXA11Y-002/004 : en-tête triable atteignable au clavier (vrai <button> +
    // aria-sort) et dont l'icône reste visible sans survol — l'ancienne version
    // posait le onClick sur la cellule (hors tabulation) et masquait l'icône
    // jusqu'au survol (inutilisable au doigt).
    const renderSortHeader = (label, sortKey, align = 'right') => {
        const isActive = sortConfig.key === sortKey;
        return (
            <TableHead
                className={`hover:bg-white/5 transition-colors group select-none text-xs ${align === 'right' ? 'text-right' : 'text-left'}`}
                aria-sort={isActive ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
                <button
                    type="button"
                    onClick={() => handleSort(sortKey)}
                    className={`inline-flex items-center gap-1 hover:text-white transition-colors ${align === 'right' ? 'justify-end w-full' : 'justify-start'} ${isActive ? 'text-primary' : ''}`}
                >
                    {label}
                    {isActive ? (
                        sortConfig.direction === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />
                    ) : (
                        <ArrowUpDown size={14} className="opacity-40 group-hover:opacity-70 transition-opacity" />
                    )}
                </button>
            </TableHead>
        );
    };

    return (
        <div className="space-y-6">
            <PlayerDetailPanel player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageHeader icon={CastleTurret} title={t('dashboard.title')} subtitle="Kingdom 2997" />
            </div>

            <DataRefreshControl />

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                    title={t('dashboard.power')}
                    value={formatNumber(kingdomStats?.totalPowerCH25 || stats.power)}
                    icon={TrendingUp}
                    color="blue"
                    subtext={kingdomStats?.totalPowerCH25 ? "CH25 only" : "Total"}
                />
                <StatCard
                    title={t('dashboard.kp')}
                    value={formatNumber(stats.kp)}
                    icon={Sword}
                    color="red"
                />
                <StatCard
                    title={t('dashboard.dead')}
                    value={formatNumber(stats.deads)}
                    icon={Skull}
                    color="slate"
                />
                <StatCard
                    title={t('dashboard.players')}
                    value={players.length}
                    icon={Users}
                    color="amber"
                    subtext="Top 300"
                />
            </div>

            {/* Player List — pleine largeur (layout maquette Dashboard Home B) */}
            <section className="v2-glass overflow-hidden flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 pt-4 md:pt-5">
                    <h3 className="text-lg font-semibold text-white">{t('dashboard.player_list')}</h3>
                    <span className="text-sm text-slate-400">
                        {t('common.showing_records', { count: sortedPlayers.length })}
                    </span>
                </div>

                {/* Filters — intégrés dans la carte */}
                <div className="flex flex-col gap-3 px-4 md:px-6 py-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <div className="flex-1 w-full relative group">
                            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                aria-label={t('common.search')}
                                placeholder={t('common.search')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full min-h-[40px] bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-xl ps-10 pe-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="w-10 h-10 rounded-xl bg-[var(--border-flat)] flex items-center justify-center border border-[var(--border-flat)] text-slate-400">
                                <Filter size={18} />
                            </div>
                            <select
                                className="flex-1 sm:flex-none bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer min-w-[140px]"
                                value={selectedAlliance}
                                onChange={(e) => setSelectedAlliance(e.target.value)}
                            >
                                {alliances.map(a => (
                                    <option key={a} value={a} className="bg-slate-900">{a === "All" ? t('common.all') : a}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Mobile Sort Row (visible on small screens to replace table headers) */}
                    <div className="flex sm:hidden items-center gap-2 pt-3 border-t border-[var(--border-flat)]/50">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold min-w-[60px]">Sort by:</span>
                        <select
                            className="flex-1 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50"
                            value={sortConfig.key}
                            onChange={(e) => setSortConfig(prev => ({ ...prev, key: e.target.value }))}
                        >
                            <option value="rank">Rank</option>
                            <option value="power">Power</option>
                            <option value="kp">Kill Points</option>
                            <option value="deads">Deads</option>
                        </select>
                        <button
                            onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'desc' ? 'asc' : 'desc' }))}
                            className="p-2 bg-[var(--border-flat)] hover:bg-slate-700/50 rounded-lg border border-[var(--border-flat)] transition-colors text-slate-300 min-w-[44px] flex items-center justify-center"
                        >
                            {sortConfig.direction === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                        </button>
                    </div>
                </div>

                <div className="h-[560px] overflow-auto custom-scrollbar relative border-t border-[var(--border-flat)]">
                    {/* Mobile Card View */}
                    <div className="md:hidden flex flex-col gap-3 p-4">
                        {displayedPlayers.map((player) => (
                            <div
                                key={player.id}
                                className="bg-[var(--surface-solid)] p-3 rounded-xl border border-[var(--border-flat)] hover:border-primary/50 flex flex-col gap-3 cursor-pointer transition-colors"
                                onClick={() => setSelectedPlayer(player)}
                            >
                                <div className="flex items-center gap-3 border-b border-[var(--border-flat)] pb-2">
                                    <div className="bg-slate-900 text-slate-400 text-xs font-bold px-2 py-1 rounded">#{player.rank}</div>
                                    <Avatar id={player.id} name={player.name} size="sm" className="border border-[var(--border-flat)]" />
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white text-sm">{player.name}</span>
                                            <span className="text-[10px] text-slate-500">[{player.alliance || '---'}] {player.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 px-1">
                                    <div className="flex flex-col text-xs">
                                        <span className="text-slate-500 mb-0.5">{t('dashboard.power')}</span>
                                        <span className="font-mono font-medium text-blue-400">{formatNumber(player.power)}</span>
                                    </div>
                                    <div className="flex flex-col text-xs border-l border-[var(--border-flat)] pl-2">
                                        <span className="text-slate-500 mb-0.5">Kill Points</span>
                                        <span className="font-mono font-medium text-red-400">{formatNumber(player.kp)}</span>
                                    </div>
                                    <div className="flex flex-col text-xs border-l border-[var(--border-flat)] pl-2">
                                        <span className="text-slate-500 mb-0.5">{t('dashboard.total_dead')}</span>
                                        <span className="font-mono font-medium text-slate-400">{formatNumber(player.deads)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block w-full min-w-[600px]">
                        <Table>
                            <TableHeader className="bg-[var(--surface)] sticky top-0 backdrop-blur-md z-10">
                                <TableRow>
                                    {renderSortHeader(t('dashboard.rank'), 'rank', 'center')}
                                    {renderSortHeader(t('dashboard.name'), 'name', 'left')}
                                    {renderSortHeader(t('dashboard.power'), 'power')}
                                    {renderSortHeader('Kill Points', 'kp')}
                                    {renderSortHeader(t('dashboard.total_dead'), 'deads')}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedPlayers.map((player) => (
                                    <TableRow
                                        key={player.id}
                                        className="group cursor-pointer hover:bg-white/5 transition-colors"
                                        onClick={() => setSelectedPlayer(player)}
                                    >
                                        <TableCell className="text-center font-medium text-slate-500 group-hover:text-slate-300">#{player.rank}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0">
                                                    <Avatar
                                                        id={player.id}
                                                        name={player.name}
                                                        size="sm"
                                                        className="border border-[var(--border-flat)]"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-200 group-hover:text-primary transition-colors">{player.name}</span>
                                                    <span className="text-xs text-slate-500">[{player.alliance || '---'}] {player.id}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-blue-400">{formatNumber(player.power)}</TableCell>
                                        <TableCell className="text-right font-mono text-red-400">{formatNumber(player.kp)}</TableCell>
                                        <TableCell className="text-right font-mono text-slate-400">{formatNumber(player.deads)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </section>

            {/* Ligne 50/50 : Trésorerie + Total Power (maquette Dashboard Home B) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Kingdom Treasury */}
                <section className="v2-glass p-4 md:p-5 flex flex-col min-w-0">
                    <h3 className="flex items-center gap-2.5 text-[15px] font-semibold text-white mb-4">
                        <Coins size={20} weight="duotone" className="text-amber-400" />
                        {t('bank.title')}
                    </h3>
                    {bankValues ? (
                        <>
                            <div className="flex flex-col gap-2 flex-1 justify-center">
                                {TREASURY_RESOURCES.map(({ key, icon: Icon, color }) => (
                                    <div key={key} className="flex items-center gap-3 min-h-[44px] px-3 rounded-[10px] bg-[var(--border-flat)] text-[13px]">
                                        <span
                                            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-none"
                                            style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
                                        >
                                            {Icon && <Icon size={17} weight="duotone" />}
                                        </span>
                                        <span className="text-[var(--text-secondary)] font-semibold w-20 md:w-24 flex-none truncate">{t(`bank.${key}`)}</span>
                                        <span
                                            className="flex-1 h-[5px] rounded-full overflow-hidden"
                                            style={{ background: 'color-mix(in srgb, var(--text-meta) 18%, transparent)' }}
                                        >
                                            <span
                                                className="block h-full rounded-full"
                                                style={{ width: `${Math.round((bankValues.vals[key] / bankValues.max) * 100)}%`, background: color }}
                                            />
                                        </span>
                                        <span className="font-mono font-bold text-[var(--text-primary)] text-sm w-14 text-end flex-none">
                                            {formatNumber(bankValues.vals[key])}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-3.5 text-[11px] text-[var(--text-meta)]">
                                <span>{t('datarefresh.last_sync')}: {bank.updatedAt ? new Date(bank.updatedAt).toLocaleDateString() : '—'}</span>
                                <Link to="/bank" className="text-[12px] font-bold text-amber-500 hover:text-amber-400 inline-flex items-center gap-1.5">
                                    <ArrowRight size={14} className="rtl:-scale-x-100" />
                                    {t('dashboard.open_bank')}
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2 flex-1">
                            <AlertCircle size={32} />
                            <span>{t('common.error')}</span>
                        </div>
                    )}
                </section>

                {/* Power History with KP */}
                <section className="v2-glass v2-indigo p-4 md:p-5 flex flex-col min-w-0 overflow-hidden">
                    <h3 className="flex items-center gap-2.5 text-[15px] font-semibold text-white mb-3">
                        <TrendingUp size={19} weight="duotone" className="text-[var(--indigo)]" />
                        {t('dashboard.power')}
                    </h3>
                    <div className="flex-1 min-h-[280px]">
                        {history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={history.slice(-15)}>
                                    <defs>
                                        <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        yAxisId="power"
                                        orientation="left"
                                        tick={{ fontSize: 10, fill: '#3b82f6' }}
                                        tickFormatter={(val) => formatNumber(val)}
                                        axisLine={false}
                                        tickLine={false}
                                        width={40}
                                    />
                                    <YAxis
                                        yAxisId="kp"
                                        orientation="right"
                                        tick={{ fontSize: 10, fill: '#ef4444' }}
                                        tickFormatter={(val) => formatNumber(val)}
                                        axisLine={false}
                                        tickLine={false}
                                        width={40}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff', opacity: 0.05 }}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
                                    />
                                    <Area
                                        yAxisId="power"
                                        type="monotone"
                                        dataKey="power"
                                        stroke="#3b82f6"
                                        fill="url(#colorPower)"
                                        strokeWidth={2}
                                        name="Total Power"
                                    />
                                    <Line
                                        yAxisId="kp"
                                        type="monotone"
                                        dataKey="kp"
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                        name="Kill Points"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                {t('common.loading')}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DashboardPage;
